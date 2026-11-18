import "server-only"
import { Prisma } from "@prisma/client"
import { avatarFromRow } from "@/lib/avatar"
import { maskReviewerName, roundAverage, type RatingSummary, type ReviewItem, type ReviewSummary } from "@/lib/review"
import { productReviewListSchema, reviewInputSchema, reviewProductIdSchema, type ProductReviewListInput, type ReviewInput } from "@/lib/validators/review"
import { db } from "@/server/db"
import { deleteReviewImageFiles } from "./review-image.service"

/*
 * Đánh giá sản phẩm, phía khách. userId do Server Action lấy từ phiên (không phải tham số client).
 * Quy tắc: chỉ khách có đơn DELIVERED chứa sản phẩm mới được đánh giá; mỗi khách một đánh giá cho mỗi sản phẩm;
 * đánh giá hiện ngay, Admin ẩn sau. Khách sửa đánh giá đang bị ẩn thì nó VẪN bị ẩn (sửa không phải cách để hiện lại).
 */

export type ReviewErrorCode = "INVALID_INPUT" | "PRODUCT_NOT_FOUND" | "NOT_ELIGIBLE" | "REVIEW_NOT_FOUND"

export class ReviewError extends Error {
  constructor(
    public readonly code: ReviewErrorCode,
    message: string
  ) {
    super(message)
    this.name = "ReviewError"
  }
}

const AUTHOR_SELECT = { name: true, avatarKind: true, avatarColor: true, avatarStyle: true, avatarSeed: true, avatarUrl: true } as const

/** Khách đã nhận hàng (đơn DELIVERED) có chứa sản phẩm này. Dòng đơn có variantId null (biến thể bị xoá) không tính. */
export async function hasDeliveredProduct(userId: string, productId: string): Promise<boolean> {
  const hit = await db.orderItem.findFirst({
    where: { order: { userId, status: "DELIVERED" }, variant: { productId } },
    select: { id: true },
  })
  return hit !== null
}

export interface MyReviewState {
  /** Có được viết/sửa đánh giá hay không (đã nhận hàng). */
  canReview: boolean
  /** Đánh giá hiện có của chính khách (kể cả đang bị ẩn). */
  review: { id: string; rating: number; content: string | null; images: string[]; hidden: boolean } | null
}

export async function getMyReviewState(userId: string, productId: string): Promise<MyReviewState> {
  const id = reviewProductIdSchema.parse(productId)
  const [canReview, row] = await Promise.all([
    hasDeliveredProduct(userId, id),
    db.review.findUnique({
      where: { userId_productId: { userId, productId: id } },
      select: { id: true, rating: true, content: true, status: true, images: { orderBy: { position: "asc" }, select: { url: true } } },
    }),
  ])
  return {
    canReview,
    review: row ? { id: row.id, rating: row.rating, content: row.content, images: row.images.map((i) => i.url), hidden: row.status === "HIDDEN" } : null,
  }
}

/** Tạo hoặc sửa đánh giá của chính khách. */
export async function saveReview(userId: string, input: ReviewInput): Promise<{ id: string }> {
  const parsed = reviewInputSchema.safeParse(input)
  if (!parsed.success) throw new ReviewError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Đánh giá không hợp lệ")
  const { productId, rating, content, images } = parsed.data

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) throw new ReviewError("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm")
  if (!(await hasDeliveredProduct(userId, productId))) {
    throw new ReviewError("NOT_ELIGIBLE", "Bạn chỉ có thể đánh giá sản phẩm sau khi đã nhận hàng")
  }

  // Upsert theo (userId, productId): hai lần gửi đồng thời vẫn chỉ ra một dòng. `update` không chạm status/hidden*.
  // Ảnh (nếu có) được thay trọn bộ trong CÙNG giao dịch; file bị bỏ chỉ xoá khỏi đĩa sau khi giao dịch thành công.
  let removed: string[] = []
  let row: { id: string }
  try {
    row = await db.$transaction(async (tx) => {
      const review = await tx.review.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId, rating, content },
        update: { rating, content },
        select: { id: true },
      })
      if (images !== undefined) {
        const before = await tx.reviewImage.findMany({ where: { reviewId: review.id }, select: { url: true } })
        removed = before.map((b) => b.url).filter((u) => !images.includes(u))
        await tx.reviewImage.deleteMany({ where: { reviewId: review.id } })
        if (images.length > 0) {
          await tx.reviewImage.createMany({ data: images.map((url, position) => ({ reviewId: review.id, url, position })) })
        }
      }
      return review
    })
  } catch (e) {
    // `url` là duy nhất: ảnh đã gắn vào đánh giá khác thì không dùng lại được.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && String(e.meta?.target).includes("url")) {
      throw new ReviewError("INVALID_INPUT", "Ảnh không hợp lệ")
    }
    throw e
  }
  await deleteReviewImageFiles(removed)
  return row
}

/** Xoá hẳn đánh giá của chính khách (kể cả khi đang bị ẩn), cùng các file ảnh của nó. */
export async function deleteMyReview(userId: string, productId: string): Promise<void> {
  const id = reviewProductIdSchema.safeParse(productId)
  if (!id.success) throw new ReviewError("INVALID_INPUT", "Mã sản phẩm không hợp lệ")
  const review = await db.review.findUnique({
    where: { userId_productId: { userId, productId: id.data } },
    select: { id: true, images: { select: { url: true } } },
  })
  if (!review) throw new ReviewError("REVIEW_NOT_FOUND", "Bạn chưa có đánh giá cho sản phẩm này")
  await db.review.deleteMany({ where: { id: review.id, userId } })
  await deleteReviewImageFiles(review.images.map((i) => i.url))
}

export interface ProductReviewList {
  items: ReviewItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Đánh giá đang hiển thị của một sản phẩm, mới nhất trước. */
export async function listProductReviews(input: ProductReviewListInput): Promise<ProductReviewList> {
  const { productId, page, pageSize } = productReviewListSchema.parse(input)
  const where = { productId, status: "VISIBLE" } as const
  const [total, rows] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        images: { orderBy: { position: "asc" }, select: { url: true } },
        user: { select: AUTHOR_SELECT },
      },
    }),
  ])
  return {
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      images: r.images.map((i) => i.url),
      createdAt: r.createdAt,
      edited: r.updatedAt.getTime() - r.createdAt.getTime() > 1000,
      authorName: maskReviewerName(r.user.name),
      avatar: avatarFromRow(r.user),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/** Sao trung bình, tổng số và phân bố theo mức sao của một sản phẩm (chỉ đánh giá đang hiển thị). */
export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  const id = reviewProductIdSchema.parse(productId)
  const groups = await db.review.groupBy({ by: ["rating"], where: { productId: id, status: "VISIBLE" }, _count: { _all: true } })
  const distribution: ReviewSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  let count = 0
  for (const g of groups) {
    if (g.rating < 1 || g.rating > 5) continue
    distribution[g.rating as 1 | 2 | 3 | 4 | 5] = g._count._all
    sum += g.rating * g._count._all
    count += g._count._all
  }
  return { average: roundAverage(sum, count), count, distribution }
}

/** Sao trung bình cho nhiều sản phẩm bằng MỘT truy vấn (thẻ sản phẩm trong danh sách). Sản phẩm chưa có đánh giá không có khoá trong Map. */
export async function getRatingsForProducts(productIds: string[]): Promise<Map<string, RatingSummary>> {
  const ids = [...new Set(productIds)].filter(Boolean)
  const result = new Map<string, RatingSummary>()
  if (ids.length === 0) return result
  const groups = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: ids }, status: "VISIBLE" },
    _count: { _all: true },
    _sum: { rating: true },
  })
  for (const g of groups) {
    const count = g._count._all
    result.set(g.productId, { average: roundAverage(g._sum.rating ?? 0, count), count })
  }
  return result
}
