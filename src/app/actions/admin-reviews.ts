"use server"

import { revalidatePath } from "next/cache"
import type { AdminActionResult } from "@/lib/admin-action"
import { getAdminUser, NOT_ADMIN_MESSAGE } from "@/server/auth/admin"
import { AdminCatalogError } from "@/server/services/admin-catalog.service"
import { hideReview, showReview } from "@/server/services/admin-review.service"

/** Ẩn/hiện đổi sao trung bình và danh sách ở phía khách, nên làm mới cả cửa hàng lẫn trang Admin. */
function refresh() {
  revalidatePath("/", "layout")
  revalidatePath("/admin/reviews")
}

/** Ẩn một đánh giá (lý do tuỳ chọn). Gọi getAdminUser() TRƯỚC rồi mới validate và gọi service. */
export async function hideReviewAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }
  try {
    await hideReview({ userId: admin.id }, input as Parameters<typeof hideReview>[1])
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  refresh()
  return { ok: true, message: "Đã ẩn đánh giá" }
}

/** Hiện lại một đánh giá đã ẩn. */
export async function showReviewAction(reviewId: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }
  try {
    await showReview({ userId: admin.id }, reviewId as string)
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  refresh()
  return { ok: true, message: "Đã hiện lại đánh giá" }
}
