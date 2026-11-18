import "server-only"
import type { Prisma } from "@prisma/client"
import { avatarFromRow, type AvatarData } from "@/lib/avatar"
import { adminContextSchema, type AdminContext } from "@/lib/validators/admin-catalog"
import { adminReviewListSchema, hideReviewSchema, type AdminReviewListInput, type HideReviewInput } from "@/lib/validators/admin-review"
import { reviewIdSchema } from "@/lib/validators/review"
import { db } from "@/server/db"
import { AdminCatalogError, parseInput } from "./admin-catalog.service"

/*
 * Admin: xem và ẩn/hiện đánh giá sản phẩm. Service không tự kiểm quyền (Server Action gọi getAdminUser() trước).
 * Ẩn không xoá: khách vẫn thấy đánh giá của mình ở form (đánh dấu "đang bị ẩn") nhưng người khác không thấy và không tính vào sao trung bình.
 */

export interface AdminReviewItem {
  id: string
  rating: number
  content: string | null
  images: string[]
  status: "VISIBLE" | "HIDDEN"
  hiddenAt: Date | null
  hiddenReason: string | null
  createdAt: Date
  product: { id: string; name: string; slug: string }
  user: { id: string; name: string; email: string; avatar: AvatarData }
}

export interface AdminReviewList {
  items: AdminReviewItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  /** Số đánh giá theo từng trạng thái (cho các tab), không phụ thuộc bộ lọc đang chọn. */
  counts: { all: number; visible: number; hidden: number }
}

const SELECT = {
  id: true,
  rating: true,
  content: true,
  images: { orderBy: { position: "asc" }, select: { url: true } },
  status: true,
  hiddenAt: true,
  hiddenReason: true,
  createdAt: true,
  product: { select: { id: true, name: true, slug: true } },
  user: { select: { id: true, name: true, email: true, avatarKind: true, avatarColor: true, avatarStyle: true, avatarSeed: true, avatarUrl: true } },
} satisfies Prisma.ReviewSelect

export async function listAdminReviews(input: AdminReviewListInput = {}): Promise<AdminReviewList> {
  const { status, rating, q, page, pageSize } = adminReviewListSchema.parse(input)

  const where: Prisma.ReviewWhereInput = {}
  if (status === "visible") where.status = "VISIBLE"
  if (status === "hidden") where.status = "HIDDEN"
  if (rating) where.rating = rating
  if (q) {
    where.OR = [
      { product: { name: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { content: { contains: q, mode: "insensitive" } },
    ]
  }

  const [total, rows, visible, hidden] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: SELECT,
    }),
    db.review.count({ where: { status: "VISIBLE" } }),
    db.review.count({ where: { status: "HIDDEN" } }),
  ])

  return {
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      images: r.images.map((i) => i.url),
      status: r.status,
      hiddenAt: r.hiddenAt,
      hiddenReason: r.hiddenReason,
      createdAt: r.createdAt,
      product: r.product,
      user: { id: r.user.id, name: r.user.name, email: r.user.email, avatar: avatarFromRow(r.user) },
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    counts: { all: visible + hidden, visible, hidden },
  }
}

const notFound = () => new AdminCatalogError("REVIEW_NOT_FOUND", "Không tìm thấy đánh giá")

/** Ẩn đánh giá (kèm lý do tuỳ chọn). Ẩn lại đánh giá đã ẩn thì ghi đè lý do và thời điểm ẩn. */
export async function hideReview(admin: AdminContext, input: HideReviewInput): Promise<void> {
  const { userId } = parseInput(adminContextSchema, admin)
  const { reviewId, reason } = parseInput(hideReviewSchema, input)
  const { count } = await db.review.updateMany({
    where: { id: reviewId },
    data: { status: "HIDDEN", hiddenAt: new Date(), hiddenById: userId, hiddenReason: reason },
  })
  if (count === 0) throw notFound()
}

/** Hiện lại đánh giá đã ẩn; xoá dấu vết ẩn. */
export async function showReview(admin: AdminContext, reviewId: string): Promise<void> {
  parseInput(adminContextSchema, admin)
  const id = parseInput(reviewIdSchema, reviewId)
  const { count } = await db.review.updateMany({
    where: { id },
    data: { status: "VISIBLE", hiddenAt: null, hiddenById: null, hiddenReason: null },
  })
  if (count === 0) throw notFound()
}
