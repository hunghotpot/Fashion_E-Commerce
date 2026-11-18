import { z } from "zod"
import { reviewIdSchema } from "@/lib/validators/review"

/* Validator cho Admin → Đánh giá. Bộ lọc nằm trong URL nên lỏng: sai giá trị thì về mặc định. */

export const REVIEW_STATUS_FILTERS = ["all", "visible", "hidden"] as const
export type ReviewStatusFilter = (typeof REVIEW_STATUS_FILTERS)[number]

export const DEFAULT_ADMIN_REVIEW_PAGE_SIZE = 10
export const MAX_ADMIN_REVIEW_PAGE_SIZE = 50
export const MAX_HIDDEN_REASON = 200

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v)

export const adminReviewListSchema = z.object({
  status: z.preprocess(first, z.enum(REVIEW_STATUS_FILTERS)).catch("all"),
  /** Lọc theo số sao; không hợp lệ thì bỏ lọc. */
  rating: z.preprocess(first, z.coerce.number().int().min(1).max(5).optional()).catch(undefined),
  /** Tìm theo tên sản phẩm, tên hoặc email khách. */
  q: z
    .preprocess((v) => (typeof first(v) === "string" ? (first(v) as string).trim() : undefined), z.string().max(100).optional())
    .transform((v) => v || undefined)
    .catch(undefined),
  page: z.preprocess(first, z.coerce.number().int().min(1).max(10_000)).catch(1),
  pageSize: z.preprocess(first, z.coerce.number().int().min(1).max(MAX_ADMIN_REVIEW_PAGE_SIZE)).catch(DEFAULT_ADMIN_REVIEW_PAGE_SIZE),
})

export type AdminReviewListFilters = z.output<typeof adminReviewListSchema>
export type AdminReviewListInput = Partial<AdminReviewListFilters>

export const hideReviewSchema = z.object({
  reviewId: reviewIdSchema,
  reason: z
    .string({ error: "Lý do không hợp lệ" })
    .trim()
    .max(MAX_HIDDEN_REASON, `Lý do tối đa ${MAX_HIDDEN_REASON} ký tự`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
})

export type HideReviewInput = z.input<typeof hideReviewSchema>
