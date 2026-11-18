import { beforeEach, describe, expect, it, vi } from "vitest"

const getCurrentUser = vi.fn()
const getAdminUser = vi.fn()
const saveReview = vi.fn()
const deleteMyReview = vi.fn()
const hideReview = vi.fn()
const showReview = vi.fn()
const revalidatePath = vi.fn()

vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))
vi.mock("@/server/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }))
vi.mock("@/server/auth/admin", () => ({ getAdminUser: () => getAdminUser(), NOT_ADMIN_MESSAGE: "Không có quyền" }))
vi.mock("@/server/services/review.service", () => {
  class ReviewError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  }
  return { ReviewError, saveReview: (...a: unknown[]) => saveReview(...a), deleteMyReview: (...a: unknown[]) => deleteMyReview(...a) }
})
vi.mock("@/server/services/admin-catalog.service", () => {
  class AdminCatalogError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  }
  return { AdminCatalogError }
})
vi.mock("@/server/services/admin-review.service", () => ({
  hideReview: (...a: unknown[]) => hideReview(...a),
  showReview: (...a: unknown[]) => showReview(...a),
}))

import { AdminCatalogError } from "@/server/services/admin-catalog.service"
import { ReviewError } from "@/server/services/review.service"
import { hideReviewAction, showReviewAction } from "./admin-reviews"
import { deleteReviewAction, saveReviewAction } from "./review"

describe("review actions (khách)", () => {
  beforeEach(() => {
    for (const m of [getCurrentUser, saveReview, deleteMyReview, revalidatePath]) m.mockReset()
    getCurrentUser.mockResolvedValue({ id: "u1", role: "CUSTOMER" })
    saveReview.mockResolvedValue({ id: "r1" })
    deleteMyReview.mockResolvedValue(undefined)
  })

  it("chưa đăng nhập thì từ chối và không gọi service", async () => {
    getCurrentUser.mockResolvedValue(null)
    expect(await saveReviewAction({ productId: "p1", rating: 5 })).toMatchObject({ ok: false })
    expect(await deleteReviewAction("p1")).toMatchObject({ ok: false })
    expect(saveReview).not.toHaveBeenCalled()
    expect(deleteMyReview).not.toHaveBeenCalled()
  })

  it("userId lấy từ phiên, không từ đầu vào; ghi xong thì làm mới trang", async () => {
    expect(await saveReviewAction({ productId: "p1", rating: 5, userId: "nguoi-khac" })).toMatchObject({ ok: true })
    expect(saveReview.mock.calls[0][0]).toBe("u1")
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    expect(await deleteReviewAction("p1")).toMatchObject({ ok: true })
    expect(deleteMyReview).toHaveBeenCalledWith("u1", "p1")
  })

  it("lỗi nghiệp vụ trả message, không ném ra ngoài và không làm mới trang", async () => {
    saveReview.mockRejectedValue(new ReviewError("NOT_ELIGIBLE", "Bạn chỉ có thể đánh giá sản phẩm sau khi đã nhận hàng"))
    expect(await saveReviewAction({})).toEqual({ ok: false, message: "Bạn chỉ có thể đánh giá sản phẩm sau khi đã nhận hàng" })
    deleteMyReview.mockRejectedValue(new ReviewError("REVIEW_NOT_FOUND", "Bạn chưa có đánh giá cho sản phẩm này"))
    expect(await deleteReviewAction("p1")).toEqual({ ok: false, message: "Bạn chưa có đánh giá cho sản phẩm này" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("lỗi không lường trước vẫn được ném ra", async () => {
    saveReview.mockRejectedValue(new Error("db down"))
    await expect(saveReviewAction({})).rejects.toThrow("db down")
  })
})

describe("review actions (Admin)", () => {
  beforeEach(() => {
    for (const m of [getAdminUser, hideReview, showReview, revalidatePath]) m.mockReset()
    getAdminUser.mockResolvedValue({ id: "a1" })
    hideReview.mockResolvedValue(undefined)
    showReview.mockResolvedValue(undefined)
  })

  it("không phải Admin thì từ chối và không gọi service", async () => {
    getAdminUser.mockResolvedValue(null)
    expect(await hideReviewAction({ reviewId: "r1" })).toEqual({ ok: false, message: "Không có quyền" })
    expect(await showReviewAction("r1")).toEqual({ ok: false, message: "Không có quyền" })
    expect(hideReview).not.toHaveBeenCalled()
    expect(showReview).not.toHaveBeenCalled()
  })

  it("adminId lấy từ phiên Admin; ẩn/hiện xong thì làm mới cửa hàng và trang Admin", async () => {
    expect(await hideReviewAction({ reviewId: "r1", reason: "spam" })).toMatchObject({ ok: true })
    expect(hideReview).toHaveBeenCalledWith({ userId: "a1" }, { reviewId: "r1", reason: "spam" })
    expect(await showReviewAction("r1")).toMatchObject({ ok: true })
    expect(showReview).toHaveBeenCalledWith({ userId: "a1" }, "r1")
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reviews")
  })

  it("lỗi nghiệp vụ trả message", async () => {
    hideReview.mockRejectedValue(new AdminCatalogError("REVIEW_NOT_FOUND", "Không tìm thấy đánh giá"))
    expect(await hideReviewAction({ reviewId: "x" })).toEqual({ ok: false, message: "Không tìm thấy đánh giá" })
    showReview.mockRejectedValue(new AdminCatalogError("REVIEW_NOT_FOUND", "Không tìm thấy đánh giá"))
    expect(await showReviewAction("x")).toEqual({ ok: false, message: "Không tìm thấy đánh giá" })
  })
})
