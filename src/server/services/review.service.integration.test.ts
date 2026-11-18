import { afterAll, describe, expect, it } from "vitest"
import type { OrderStatus } from "@prisma/client"
import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { deleteMyReview, getMyReviewState, getRatingsForProducts, getReviewSummary, listProductReviews, ReviewError, saveReview } from "./review.service"

/* Test tích hợp: đánh giá sản phẩm phía khách (điều kiện đã nhận hàng, mỗi khách một đánh giá, tổng hợp sao). */
const fx = createFixtures()
let seq = 0

afterAll(async () => {
  await fx.cleanup()
  await db.$disconnect()
})

/** Khách mới + sản phẩm; nếu `status` được truyền thì tạo luôn một đơn ở trạng thái đó chứa sản phẩm. */
async function setup(status?: OrderStatus) {
  const variant = await fx.makeVariant(5, 100_000)
  const { user } = await fx.makeBuyer([{ variantId: variant.id, quantity: 1 }])
  if (status) await makeOrder(user.id, variant.id, status)
  return { user, variant, productId: variant.productId }
}

async function makeOrder(userId: string, variantId: string, status: OrderStatus) {
  await db.order.create({
    data: {
      code: `RV-${Date.now().toString(36)}-${++seq}`,
      userId,
      status,
      subtotal: 100_000,
      total: 100_000,
      shippingAddress: {},
      paymentMethod: "COD",
      items: { create: { variantId, productName: "SP", sku: `sku-${seq}`, size: "M", color: "Đen", unitPrice: 100_000, quantity: 1 } },
    },
  })
}

const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toMatchObject({ name: "ReviewError", code })

describe("review.service: điều kiện được đánh giá", () => {
  it("chưa mua hoặc đơn chưa giao thì không được đánh giá", async () => {
    const none = await setup()
    await rejects(saveReview(none.user.id, { productId: none.productId, rating: 5 }), "NOT_ELIGIBLE")
    const pending = await setup("PENDING")
    await rejects(saveReview(pending.user.id, { productId: pending.productId, rating: 5 }), "NOT_ELIGIBLE")
    const cancelled = await setup("CANCELLED")
    await rejects(saveReview(cancelled.user.id, { productId: cancelled.productId, rating: 5 }), "NOT_ELIGIBLE")
    expect(await db.review.count({ where: { productId: { in: [none.productId, pending.productId, cancelled.productId] } } })).toBe(0)
  })

  it("đơn đã giao thì được; mua sản phẩm khác không cho đánh giá sản phẩm này", async () => {
    const a = await setup("DELIVERED")
    expect((await getMyReviewState(a.user.id, a.productId)).canReview).toBe(true)
    const other = await fx.makeVariant(5, 100_000)
    expect((await getMyReviewState(a.user.id, other.productId)).canReview).toBe(false)
    await rejects(saveReview(a.user.id, { productId: other.productId, rating: 4 }), "NOT_ELIGIBLE")
  })

  it("đầu vào sai bị từ chối: số sao ngoài 1–5, nội dung quá dài, sản phẩm không có", async () => {
    const a = await setup("DELIVERED")
    for (const rating of [0, 6, 3.5, Number.NaN]) {
      await rejects(saveReview(a.user.id, { productId: a.productId, rating }), "INVALID_INPUT")
    }
    await rejects(saveReview(a.user.id, { productId: a.productId, rating: 5, content: "x".repeat(1001) }), "INVALID_INPUT")
    await rejects(saveReview(a.user.id, { productId: "khong-co", rating: 5 }), "PRODUCT_NOT_FOUND")
    expect(await db.review.count({ where: { productId: a.productId } })).toBe(0)
  })
})

describe("review.service: tạo, sửa, xoá", () => {
  it("gửi lần hai là sửa chính đánh giá đó (không tạo thêm dòng); nội dung trống thành null", async () => {
    const a = await setup("DELIVERED")
    const first = await saveReview(a.user.id, { productId: a.productId, rating: 3, content: "  Vải hơi mỏng  " })
    const second = await saveReview(a.user.id, { productId: a.productId, rating: 5, content: "   " })
    expect(second.id).toBe(first.id)
    expect(await db.review.count({ where: { productId: a.productId } })).toBe(1)
    expect(await db.review.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({ rating: 5, content: null })
    expect((await getMyReviewState(a.user.id, a.productId)).review).toMatchObject({ rating: 5, content: null, hidden: false })
  })

  it("sửa đánh giá đang bị ẩn thì vẫn bị ẩn", async () => {
    const a = await setup("DELIVERED")
    const r = await saveReview(a.user.id, { productId: a.productId, rating: 1, content: "Tệ" })
    await db.review.update({ where: { id: r.id }, data: { status: "HIDDEN", hiddenAt: new Date(), hiddenReason: "spam" } })
    await saveReview(a.user.id, { productId: a.productId, rating: 2, content: "Tệ hơn" })
    expect(await db.review.findUniqueOrThrow({ where: { id: r.id } })).toMatchObject({ status: "HIDDEN", hiddenReason: "spam", rating: 2 })
    expect((await getMyReviewState(a.user.id, a.productId)).review?.hidden).toBe(true)
  })

  it("xoá đánh giá của mình; chưa có thì báo lỗi; không xoá được đánh giá của người khác", async () => {
    const a = await setup("DELIVERED")
    await rejects(deleteMyReview(a.user.id, a.productId), "REVIEW_NOT_FOUND")
    await saveReview(a.user.id, { productId: a.productId, rating: 4 })
    const b = await setup("DELIVERED")
    await rejects(deleteMyReview(b.user.id, a.productId), "REVIEW_NOT_FOUND")
    expect(await db.review.count({ where: { productId: a.productId } })).toBe(1)
    await deleteMyReview(a.user.id, a.productId)
    expect(await db.review.count({ where: { productId: a.productId } })).toBe(0)
  })

  it("lỗi là ReviewError", async () => {
    const a = await setup()
    await expect(saveReview(a.user.id, { productId: a.productId, rating: 5 })).rejects.toBeInstanceOf(ReviewError)
  })
})

describe("review.service: hiển thị và tổng hợp", () => {
  it("danh sách chỉ có đánh giá hiển thị, tên được che, có phân trang", async () => {
    const variant = await fx.makeVariant(5, 100_000)
    const productId = variant.productId
    const ids: string[] = []
    for (let i = 0; i < 3; i++) {
      const { user } = await fx.makeBuyer([{ variantId: variant.id, quantity: 1 }])
      await makeOrder(user.id, variant.id, "DELIVERED")
      ids.push((await saveReview(user.id, { productId, rating: 5 - i, content: `Nhận xét ${i}` })).id)
    }
    await db.review.update({ where: { id: ids[2] }, data: { status: "HIDDEN" } })

    const all = await listProductReviews({ productId })
    expect(all.total).toBe(2)
    expect(all.items.map((r) => r.id).sort()).toEqual([ids[0], ids[1]].sort())
    expect(all.items[0].authorName).toBe("N. M. Thử") // "Người Mua Thử" (tên trong fixture) đã che
    expect(all.items[0].avatar.kind).toBe("INITIALS")

    const p1 = await listProductReviews({ productId, page: 1, pageSize: 1 })
    const p2 = await listProductReviews({ productId, page: 2, pageSize: 1 })
    expect(p1.totalPages).toBe(2)
    expect(p1.items[0].id).not.toBe(p2.items[0].id)
    expect(await listProductReviews({ productId, page: "abc" as unknown as number })).toMatchObject({ page: 1 })
  })

  it("sao trung bình, phân bố và lấy hàng loạt không tính đánh giá bị ẩn; sản phẩm chưa có thì không có khoá", async () => {
    const variant = await fx.makeVariant(5, 100_000)
    const empty = await fx.makeVariant(5, 100_000)
    const productId = variant.productId
    const made: string[] = []
    for (const rating of [5, 4, 4, 1]) {
      const { user } = await fx.makeBuyer([{ variantId: variant.id, quantity: 1 }])
      await makeOrder(user.id, variant.id, "DELIVERED")
      made.push((await saveReview(user.id, { productId, rating })).id)
    }
    await db.review.update({ where: { id: made[3] }, data: { status: "HIDDEN" } }) // 1 sao bị ẩn

    const summary = await getReviewSummary(productId)
    expect(summary).toEqual({ average: 4.3, count: 3, distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 } })

    const map = await getRatingsForProducts([productId, empty.productId, productId])
    expect(map.get(productId)).toEqual({ average: 4.3, count: 3 })
    expect(map.has(empty.productId)).toBe(false)
    expect((await getRatingsForProducts([])).size).toBe(0)
    expect(await getReviewSummary(empty.productId)).toEqual({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } })
  })
})
