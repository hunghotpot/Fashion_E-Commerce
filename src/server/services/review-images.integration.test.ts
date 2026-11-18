import { randomUUID } from "node:crypto"
import { access, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { uploadDirFor, uploadUrl } from "@/server/uploads"
import { deleteMyReview, getMyReviewState, listProductReviews, saveReview } from "./review.service"

/*
 * Test tích hợp: ảnh kèm đánh giá (gắn, thay, xoá, giới hạn, ảnh dùng chung). File được tạo thật trong public/uploads/reviews
 * với tên UUID riêng của test và luôn được dọn sau khi xong.
 */
const fx = createFixtures()
const created: string[] = []
let seq = 0

afterAll(async () => {
  await Promise.all(created.map((f) => rm(f, { force: true })))
  await fx.cleanup()
  await db.$disconnect()
})

const exists = (file: string) => access(file).then(() => true, () => false)

async function fakeImage(): Promise<{ url: string; file: string }> {
  const name = `${randomUUID()}.webp`
  const dir = uploadDirFor("reviews")
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, name)
  await writeFile(file, Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))
  created.push(file)
  return { url: uploadUrl(name, "reviews"), file }
}

/** Khách đã nhận hàng một sản phẩm (đơn DELIVERED). */
async function deliveredBuyer(variant?: Awaited<ReturnType<typeof fx.makeVariant>>) {
  const v = variant ?? (await fx.makeVariant(5, 100_000))
  const { user } = await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])
  await db.order.create({
    data: {
      code: `RI-${Date.now().toString(36)}-${++seq}`,
      userId: user.id,
      status: "DELIVERED",
      subtotal: 100_000,
      total: 100_000,
      shippingAddress: {},
      paymentMethod: "COD",
      items: { create: { variantId: v.id, productName: "SP", sku: `ri-sku-${seq}`, size: "M", color: "Đen", unitPrice: 100_000, quantity: 1 } },
    },
  })
  return { user, productId: v.productId, variant: v }
}

describe("review: ảnh kèm theo", () => {
  it("gắn ảnh theo đúng thứ tự và trả ra ở danh sách lẫn trạng thái của chính khách", async () => {
    const a = await deliveredBuyer()
    const [i1, i2] = [await fakeImage(), await fakeImage()]
    await saveReview(a.user.id, { productId: a.productId, rating: 5, images: [i2.url, i1.url] })

    expect((await getMyReviewState(a.user.id, a.productId)).review?.images).toEqual([i2.url, i1.url])
    expect((await listProductReviews({ productId: a.productId })).items[0].images).toEqual([i2.url, i1.url])
  })

  it("vắng `images` thì giữ nguyên ảnh; mảng mới thì thay trọn bộ và xoá file bị bỏ", async () => {
    const a = await deliveredBuyer()
    const [keep, drop, add] = [await fakeImage(), await fakeImage(), await fakeImage()]
    await saveReview(a.user.id, { productId: a.productId, rating: 4, images: [keep.url, drop.url] })

    await saveReview(a.user.id, { productId: a.productId, rating: 3 }) // không nói gì về ảnh
    expect((await getMyReviewState(a.user.id, a.productId)).review?.images).toEqual([keep.url, drop.url])

    await saveReview(a.user.id, { productId: a.productId, rating: 3, images: [keep.url, add.url] })
    expect((await getMyReviewState(a.user.id, a.productId)).review?.images).toEqual([keep.url, add.url])
    expect(await exists(drop.file)).toBe(false) // file bị bỏ đã xoá khỏi đĩa
    expect(await exists(keep.file)).toBe(true)
    expect(await exists(add.file)).toBe(true)

    await saveReview(a.user.id, { productId: a.productId, rating: 3, images: [] })
    expect((await getMyReviewState(a.user.id, a.productId)).review?.images).toEqual([])
    expect(await exists(keep.file)).toBe(false)
    expect(await exists(add.file)).toBe(false)
  })

  it("xoá đánh giá thì xoá luôn ảnh trong DB và file trên đĩa", async () => {
    const a = await deliveredBuyer()
    const img = await fakeImage()
    await saveReview(a.user.id, { productId: a.productId, rating: 5, images: [img.url] })
    await deleteMyReview(a.user.id, a.productId)
    expect(await db.reviewImage.count({ where: { url: img.url } })).toBe(0)
    expect(await exists(img.file)).toBe(false)
  })

  it("từ chối: quá 3 ảnh, trùng ảnh, URL sai dạng; không ghi gì và không xoá file", async () => {
    const a = await deliveredBuyer()
    const imgs = [await fakeImage(), await fakeImage(), await fakeImage(), await fakeImage()]
    const urls = imgs.map((i) => i.url)
    const bad = (images: string[]) =>
      expect(saveReview(a.user.id, { productId: a.productId, rating: 5, images })).rejects.toMatchObject({ code: "INVALID_INPUT" })

    await bad(urls) // 4 ảnh
    await bad([urls[0], urls[0]]) // trùng
    await bad(["https://evil.test/a.jpg"])
    await bad(["/uploads/avatars/" + path.basename(imgs[0].file)]) // sai thư mục
    await bad(["/uploads/reviews/../products/" + path.basename(imgs[0].file)])
    expect(await db.review.count({ where: { productId: a.productId } })).toBe(0)
    expect(await exists(imgs[0].file)).toBe(true)
  })

  it("ảnh đã gắn vào đánh giá của người khác thì không dùng lại được và không bị xoá nhầm", async () => {
    const variant = await fx.makeVariant(5, 100_000)
    const owner = await deliveredBuyer(variant)
    const other = await deliveredBuyer(variant)
    const img = await fakeImage()
    await saveReview(owner.user.id, { productId: owner.productId, rating: 5, images: [img.url] })

    await expect(saveReview(other.user.id, { productId: other.productId, rating: 1, images: [img.url] })).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(await db.review.count({ where: { userId: other.user.id } })).toBe(0) // giao dịch đã hoàn tác cả đánh giá
    expect((await getMyReviewState(owner.user.id, owner.productId)).review?.images).toEqual([img.url])
    expect(await exists(img.file)).toBe(true)
  })
})
