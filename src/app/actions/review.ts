"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/server/auth/session"
import { deleteMyReview, ReviewError, saveReview } from "@/server/services/review.service"

export type ReviewActionResult = { ok: true; message: string } | { ok: false; message: string }

const NOT_SIGNED_IN: ReviewActionResult = { ok: false, message: "Vui lòng đăng nhập để đánh giá sản phẩm" }

/** Sao trung bình hiện ở thẻ sản phẩm (trang chủ, danh sách) và trang chi tiết, nên làm mới cả nhóm trang cửa hàng. */
function refresh() {
  revalidatePath("/", "layout")
}

/** Tạo hoặc sửa đánh giá của CHÍNH người đang đăng nhập (userId lấy từ phiên, không từ đầu vào). */
export async function saveReviewAction(input: unknown): Promise<ReviewActionResult> {
  const user = await getCurrentUser()
  if (!user) return NOT_SIGNED_IN
  try {
    await saveReview(user.id, input as Parameters<typeof saveReview>[1])
  } catch (e) {
    if (e instanceof ReviewError) return { ok: false, message: e.message }
    throw e
  }
  refresh()
  return { ok: true, message: "Đã lưu đánh giá của bạn" }
}

/** Xoá đánh giá của CHÍNH người đang đăng nhập. */
export async function deleteReviewAction(productId: unknown): Promise<ReviewActionResult> {
  const user = await getCurrentUser()
  if (!user) return NOT_SIGNED_IN
  try {
    await deleteMyReview(user.id, productId as string)
  } catch (e) {
    if (e instanceof ReviewError) return { ok: false, message: e.message }
    throw e
  }
  refresh()
  return { ok: true, message: "Đã xoá đánh giá" }
}
