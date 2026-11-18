import { z } from "zod"

/* Validator cho danh sách yêu thích. userId KHÔNG nằm trong schema: luôn lấy từ phiên đăng nhập. */

export const DEFAULT_WISHLIST_PAGE_SIZE = 12
export const MAX_WISHLIST_PAGE_SIZE = 48

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)

export const wishlistProductIdSchema = z
  .string({ error: "Mã sản phẩm không hợp lệ" })
  .trim()
  .min(1, "Mã sản phẩm không hợp lệ")
  .max(64, "Mã sản phẩm không hợp lệ")

/** Trang yêu thích: tham số nằm trong URL nên lỏng, sai thì về mặc định. */
export const wishlistListSchema = z.object({
  page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000)).catch(1),
  pageSize: z.preprocess(first, z.coerce.number().int().min(1).max(MAX_WISHLIST_PAGE_SIZE)).catch(DEFAULT_WISHLIST_PAGE_SIZE),
})

export type WishlistListInput = { page?: number; pageSize?: number }
