import { afterAll, describe, expect, it } from "vitest"
import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { hideReview, listAdminReviews, showReview } from "./admin-review.service"
import { getReviewSummary, listProductReviews } from "./review.service"

/* Test tích hợp: Admin xem, lọc, ẩn và hiện lại đánh giá; đánh giá bị ẩn biến mất khỏi phía khách và khỏi sao trung bình. */
const fx = createFixtures()

afterAll(async () => {
  await fx.cleanup()
  await db.$disconnect()
})

async function seedReviews(ratings: number[]) {
  const variant = await fx.makeVariant(5, 100_000)
  const ids: string[] = []
  for (const rating of ratings) {
    const { user } = await fx.makeBuyer([{ variantId: variant.id, quantity: 1 }])
    const r = await db.review.create({ data: { userId: user.id, productId: variant.productId, rating, content: `Nhận xét ${rating} sao` } })
    ids.push(r.id)
  }
  return { productId: variant.productId, ids }
}

describe("admin-review.service", () => {
  it("liệt kê có lọc theo trạng thái, số sao, từ khoá; kèm đếm theo tab", async () => {
    const admin = await fx.makeAdmin()
    const { productId, ids } = await seedReviews([5, 4, 1])
    await hideReview({ userId: admin.id }, { reviewId: ids[2], reason: "Ngôn từ không phù hợp" })

    const mine = { q: (await db.product.findUniqueOrThrow({ where: { id: productId } })).name }
    const all = await listAdminReviews({ ...mine })
    expect(all.total).toBe(3)
    expect(all.items[0]).toMatchObject({ product: { id: productId }, user: { avatar: { kind: "INITIALS" } } })
    expect(all.counts.hidden).toBeGreaterThanOrEqual(1)
    expect(all.counts.all).toBe(all.counts.visible + all.counts.hidden)

    expect((await listAdminReviews({ ...mine, status: "hidden" })).items.map((r) => r.id)).toEqual([ids[2]])
    expect((await listAdminReviews({ ...mine, status: "visible" })).total).toBe(2)
    expect((await listAdminReviews({ ...mine, rating: 4 })).items.map((r) => r.id)).toEqual([ids[1]])
    expect((await listAdminReviews({ ...mine, rating: 5 })).total).toBe(1)
  })

  it("tham số lọc sai thì về mặc định, không ném lỗi", async () => {
    const res = await listAdminReviews({ status: "bậy" as never, rating: 99 as never, page: -3 as never })
    expect(res.page).toBe(1)
    expect(res.pageSize).toBe(10)
  })

  it("ẩn: ghi người ẩn, lý do; phía khách không thấy và sao trung bình bỏ qua; hiện lại thì trở về", async () => {
    const admin = await fx.makeAdmin()
    const { productId, ids } = await seedReviews([5, 1])

    await hideReview({ userId: admin.id }, { reviewId: ids[1], reason: "  Spam  " })
    const row = await db.review.findUniqueOrThrow({ where: { id: ids[1] } })
    expect(row).toMatchObject({ status: "HIDDEN", hiddenById: admin.id, hiddenReason: "Spam" })
    expect(row.hiddenAt).toBeInstanceOf(Date)
    expect((await listProductReviews({ productId })).total).toBe(1)
    expect(await getReviewSummary(productId)).toMatchObject({ average: 5, count: 1 })

    await showReview({ userId: admin.id }, ids[1])
    expect(await db.review.findUniqueOrThrow({ where: { id: ids[1] } })).toMatchObject({ status: "VISIBLE", hiddenAt: null, hiddenById: null, hiddenReason: null })
    expect(await getReviewSummary(productId)).toMatchObject({ average: 3, count: 2 })
  })

  it("lý do để trống thì lưu null; lý do quá dài hoặc đánh giá không tồn tại thì báo lỗi", async () => {
    const admin = await fx.makeAdmin()
    const { ids } = await seedReviews([3])
    await hideReview({ userId: admin.id }, { reviewId: ids[0] })
    expect((await db.review.findUniqueOrThrow({ where: { id: ids[0] } })).hiddenReason).toBeNull()

    await expect(hideReview({ userId: admin.id }, { reviewId: ids[0], reason: "x".repeat(201) })).rejects.toMatchObject({ code: "INVALID_INPUT" })
    await expect(hideReview({ userId: admin.id }, { reviewId: "khong-co" })).rejects.toMatchObject({ code: "REVIEW_NOT_FOUND" })
    await expect(showReview({ userId: admin.id }, "khong-co")).rejects.toMatchObject({ code: "REVIEW_NOT_FOUND" })
  })
})
