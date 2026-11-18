import { z } from "zod"
import { REVIEW_IMAGE_URL, REVIEW_MAX_IMAGES } from "@/lib/review"

/* Validator cho đánh giá sản phẩm (phía khách). userId KHÔNG nằm trong schema: luôn lấy từ phiên đăng nhập. */

export const REVIEW_MAX_CONTENT = 1000
export const REVIEW_RATINGS = [1, 2, 3, 4, 5] as const

export const DEFAULT_REVIEW_PAGE_SIZE = 5
export const MAX_REVIEW_PAGE_SIZE = 20

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)

export const reviewIdSchema = z.string({ error: "Mã đánh giá không hợp lệ" }).trim().min(1, "Mã đánh giá không hợp lệ").max(64, "Mã đánh giá không hợp lệ")
export const reviewProductIdSchema = z.string({ error: "Mã sản phẩm không hợp lệ" }).trim().min(1, "Mã sản phẩm không hợp lệ").max(64, "Mã sản phẩm không hợp lệ")

/** Nội dung nhận xét: không bắt buộc; chuỗi rỗng hoặc toàn khoảng trắng coi như không có. */
const contentSchema = z
  .string({ error: "Nội dung không hợp lệ" })
  .trim()
  .max(REVIEW_MAX_CONTENT, `Nội dung tối đa ${REVIEW_MAX_CONTENT} ký tự`)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))

/** Ảnh kèm theo: đúng URL do server sinh ở /uploads/reviews, không trùng nhau, tối đa REVIEW_MAX_IMAGES. */
const imagesSchema = z
  .array(z.string({ error: "Ảnh không hợp lệ" }).regex(REVIEW_IMAGE_URL, "Ảnh không hợp lệ"), { error: "Ảnh không hợp lệ" })
  .max(REVIEW_MAX_IMAGES, `Tối đa ${REVIEW_MAX_IMAGES} ảnh`)
  .refine((a) => new Set(a).size === a.length, "Ảnh bị trùng")

export const reviewInputSchema = z.object({
  productId: reviewProductIdSchema,
  /** Vắng = giữ nguyên bộ ảnh hiện có; có (kể cả mảng rỗng) = thay đúng bằng danh sách này. */
  images: imagesSchema.optional(),
  rating: z
    .number({ error: "Vui lòng chọn số sao" })
    .int("Số sao phải là số nguyên")
    .min(1, "Số sao từ 1 đến 5")
    .max(5, "Số sao từ 1 đến 5"),
  content: contentSchema,
})

export type ReviewInput = z.input<typeof reviewInputSchema>

/** Danh sách đánh giá hiển thị của một sản phẩm (tham số nằm trong URL nên lỏng, sai thì về mặc định). */
export const productReviewListSchema = z.object({
  productId: reviewProductIdSchema,
  page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000)).catch(1),
  pageSize: z.preprocess(first, z.coerce.number().int().min(1).max(MAX_REVIEW_PAGE_SIZE)).catch(DEFAULT_REVIEW_PAGE_SIZE),
})

export type ProductReviewListInput = { productId: string; page?: number; pageSize?: number }
