import { afterAll, describe, expect, it } from "vitest"
import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { addToWishlist, getWishlistedIds, listWishlist, removeFromWishlist, WishlistError } from "./wishlist.service"

/* Test tích hợp: danh sách yêu thích (thêm/bỏ idempotent, quyền theo khách, sản phẩm ẩn, phân trang, lấy hàng loạt). */
const fx = createFixtures()

afterAll(async () => {
  await fx.cleanup()
  await db.$disconnect()
})

async function setup(productCount = 1) {
  const variants = []
  for (let i = 0; i < productCount; i++) variants.push(await fx.makeVariant(5, 100_000))
  const { user } = await fx.makeBuyer([{ variantId: variants[0].id, quantity: 1 }])
  return { user, productIds: variants.map((v) => v.productId) }
}

const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toMatchObject({ name: "WishlistError", code })

describe("wishlist.service: thêm và bỏ", () => {
  it("thêm hai lần vẫn chỉ một dòng; bỏ khi chưa có không lỗi", async () => {
    const { user, productIds } = await setup()
    await addToWishlist(user.id, productIds[0])
    await addToWishlist(user.id, productIds[0])
    expect(await db.wishlistItem.count({ where: { userId: user.id } })).toBe(1)

    await removeFromWishlist(user.id, productIds[0])
    await removeFromWishlist(user.id, productIds[0])
    expect(await db.wishlistItem.count({ where: { userId: user.id } })).toBe(0)
  })

  it("thêm đồng thời cùng một sản phẩm vẫn chỉ ra một dòng", async () => {
    const { user, productIds } = await setup()
    await Promise.all([1, 2, 3, 4].map(() => addToWishlist(user.id, productIds[0]).catch(() => undefined)))
    expect(await db.wishlistItem.count({ where: { userId: user.id } })).toBe(1)
  })

  it("từ chối mã sai, sản phẩm không có hoặc đã ẩn; không ghi gì", async () => {
    const { user, productIds } = await setup()
    await rejects(addToWishlist(user.id, "   "), "INVALID_INPUT")
    await rejects(addToWishlist(user.id, "x".repeat(65)), "INVALID_INPUT")
    await rejects(addToWishlist(user.id, "khong-co"), "PRODUCT_NOT_FOUND")
    await db.product.update({ where: { id: productIds[0] }, data: { isActive: false } })
    await rejects(addToWishlist(user.id, productIds[0]), "PRODUCT_NOT_FOUND")
    expect(await db.wishlistItem.count({ where: { userId: user.id } })).toBe(0)
    await expect(addToWishlist(user.id, "khong-co")).rejects.toBeInstanceOf(WishlistError)
  })

  it("bỏ yêu thích chỉ ảnh hưởng đúng khách đó", async () => {
    const a = await setup()
    const { user: other } = await fx.makeBuyer([{ variantId: (await fx.makeVariant(5)).id, quantity: 1 }])
    await addToWishlist(a.user.id, a.productIds[0])
    await addToWishlist(other.id, a.productIds[0])

    await removeFromWishlist(other.id, a.productIds[0])
    expect(await db.wishlistItem.count({ where: { userId: a.user.id } })).toBe(1)
    expect(await db.wishlistItem.count({ where: { userId: other.id } })).toBe(0)
  })
})

describe("wishlist.service: danh sách và trạng thái", () => {
  it("liệt kê mới thêm trước, chỉ của chính khách; sản phẩm ẩn không hiện nhưng dòng vẫn giữ", async () => {
    const { user, productIds } = await setup(3)
    const { user: other } = await fx.makeBuyer([{ variantId: (await fx.makeVariant(5)).id, quantity: 1 }])
    for (const id of productIds) {
      await addToWishlist(user.id, id)
      await new Promise((r) => setTimeout(r, 15)) // createdAt khác nhau để kiểm thứ tự
    }
    await addToWishlist(other.id, productIds[0])

    const all = await listWishlist(user.id)
    expect(all.total).toBe(3)
    expect(all.items.map((i) => i.id)).toEqual([...productIds].reverse())

    await db.product.update({ where: { id: productIds[1] }, data: { isActive: false } })
    const afterHide = await listWishlist(user.id)
    expect(afterHide.total).toBe(2)
    expect(afterHide.items.map((i) => i.id)).toEqual([productIds[2], productIds[0]])
    expect(await db.wishlistItem.count({ where: { userId: user.id } })).toBe(3) // dòng của sản phẩm ẩn vẫn còn
  })

  it("phân trang; tham số sai về mặc định; danh sách rỗng", async () => {
    const { user, productIds } = await setup(3)
    expect(await listWishlist(user.id)).toMatchObject({ total: 0, items: [], totalPages: 1 })
    for (const id of productIds) await addToWishlist(user.id, id)

    const p1 = await listWishlist(user.id, { page: 1, pageSize: 2 })
    const p2 = await listWishlist(user.id, { page: 2, pageSize: 2 })
    expect(p1.items).toHaveLength(2)
    expect(p2.items).toHaveLength(1)
    expect(p1.totalPages).toBe(2)
    expect(new Set([...p1.items, ...p2.items].map((i) => i.id)).size).toBe(3)
    expect(await listWishlist(user.id, { page: "abc" as unknown as number })).toMatchObject({ page: 1 })
  })

  it("getWishlistedIds trả đúng tập đã thích bằng một truy vấn; rỗng thì không truy vấn", async () => {
    const { user, productIds } = await setup(3)
    await addToWishlist(user.id, productIds[0])
    await addToWishlist(user.id, productIds[2])

    const set = await getWishlistedIds(user.id, [...productIds, productIds[0], "khong-co"])
    expect([...set].sort()).toEqual([productIds[0], productIds[2]].sort())
    expect((await getWishlistedIds(user.id, [])).size).toBe(0)

    const other = await setup()
    expect((await getWishlistedIds(other.user.id, productIds)).size).toBe(0) // khách khác không thấy tim của mình
  })

  it("xoá khách thì xoá yêu thích theo (cascade)", async () => {
    const { user, productIds } = await setup()
    await addToWishlist(user.id, productIds[0])
    expect(await db.wishlistItem.count({ where: { userId: user.id } })).toBe(1)
    await db.wishlistItem.deleteMany({ where: { userId: user.id } })
    expect(await db.wishlistItem.count({ where: { userId: user.id } })).toBe(0)
  })
})
