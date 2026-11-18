import "server-only"
import { wishlistListSchema, wishlistProductIdSchema, type WishlistListInput } from "@/lib/validators/wishlist"
import { db } from "@/server/db"
import type { ProductCardData } from "@/types/catalog"
import { getProductCardsByIds } from "./catalog.service"

/*
 * Danh sách yêu thích, phía khách. userId do Server Action/trang lấy từ phiên (không phải tham số client).
 * Mỗi khách một dòng cho mỗi sản phẩm (ràng buộc duy nhất); thêm hai lần hoặc bỏ khi chưa có đều không lỗi,
 * để bấm nhanh nhiều lần không gây thông báo lỗi. Sản phẩm đã ẩn giữ dòng nhưng không hiện trong danh sách.
 */

export type WishlistErrorCode = "INVALID_INPUT" | "PRODUCT_NOT_FOUND"

export class WishlistError extends Error {
  constructor(
    public readonly code: WishlistErrorCode,
    message: string
  ) {
    super(message)
    this.name = "WishlistError"
  }
}

function parseProductId(productId: unknown): string {
  const parsed = wishlistProductIdSchema.safeParse(productId)
  if (!parsed.success) throw new WishlistError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Mã sản phẩm không hợp lệ")
  return parsed.data
}

/** Thêm sản phẩm đang bán vào yêu thích (idempotent). */
export async function addToWishlist(userId: string, productId: string): Promise<void> {
  const id = parseProductId(productId)
  const product = await db.product.findFirst({ where: { id, isActive: true }, select: { id: true } })
  if (!product) throw new WishlistError("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm")
  await db.wishlistItem.upsert({
    where: { userId_productId: { userId, productId: id } },
    create: { userId, productId: id },
    update: {},
  })
}

/** Bỏ khỏi yêu thích (idempotent: chưa có thì không làm gì). */
export async function removeFromWishlist(userId: string, productId: string): Promise<void> {
  const id = parseProductId(productId)
  await db.wishlistItem.deleteMany({ where: { userId, productId: id } })
}

/** Trong số `productIds`, những sản phẩm khách đã thích: MỘT truy vấn cho cả danh sách (không N+1). */
export async function getWishlistedIds(userId: string, productIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(productIds)].filter(Boolean)
  if (ids.length === 0) return new Set()
  const rows = await db.wishlistItem.findMany({ where: { userId, productId: { in: ids } }, select: { productId: true } })
  return new Set(rows.map((r) => r.productId))
}

export interface WishlistPage {
  items: ProductCardData[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Yêu thích của khách, mới thêm trước; chỉ sản phẩm đang bán. */
export async function listWishlist(userId: string, input: WishlistListInput = {}): Promise<WishlistPage> {
  const { page, pageSize } = wishlistListSchema.parse(input)
  const where = { userId, product: { isActive: true } }
  const [total, rows] = await Promise.all([
    db.wishlistItem.count({ where }),
    db.wishlistItem.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { productId: true },
    }),
  ])
  return {
    items: await getProductCardsByIds(rows.map((r) => r.productId)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}
