"use server"

import { revalidatePath } from "next/cache"
import { getCurrentUser } from "@/server/auth/session"
import { addToWishlist, removeFromWishlist, WishlistError } from "@/server/services/wishlist.service"

export type WishlistActionResult = { ok: true; message: string } | { ok: false; message: string }

const NOT_SIGNED_IN: WishlistActionResult = { ok: false, message: "Vui lòng đăng nhập để lưu sản phẩm yêu thích" }

/** Trạng thái tim hiện ở thẻ sản phẩm nhiều trang và trang Yêu thích, nên làm mới cả nhóm trang cửa hàng. */
function refresh() {
  revalidatePath("/", "layout")
}

/** Thêm vào yêu thích của CHÍNH người đang đăng nhập (userId lấy từ phiên, không từ đầu vào). */
export async function addToWishlistAction(productId: unknown): Promise<WishlistActionResult> {
  const user = await getCurrentUser()
  if (!user) return NOT_SIGNED_IN
  try {
    await addToWishlist(user.id, productId as string)
  } catch (e) {
    if (e instanceof WishlistError) return { ok: false, message: e.message }
    throw e
  }
  refresh()
  return { ok: true, message: "Đã thêm vào yêu thích" }
}

/** Bỏ khỏi yêu thích của CHÍNH người đang đăng nhập. */
export async function removeFromWishlistAction(productId: unknown): Promise<WishlistActionResult> {
  const user = await getCurrentUser()
  if (!user) return NOT_SIGNED_IN
  try {
    await removeFromWishlist(user.id, productId as string)
  } catch (e) {
    if (e instanceof WishlistError) return { ok: false, message: e.message }
    throw e
  }
  refresh()
  return { ok: true, message: "Đã bỏ khỏi yêu thích" }
}
