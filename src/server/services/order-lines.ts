import "server-only"
import type { Prisma } from "@prisma/client"
import type { OrderSource } from "@/lib/order-source"

/*
 * Nạp các dòng hàng của một lần thanh toán theo `OrderSource` (xem src/lib/order-source.ts). Dùng chung cho đặt đơn và xem trước voucher.
 * Trả `cartId` (null khi mua ngay) để đặt đơn biết xoá dòng nào khỏi giỏ.
 */
export const lineVariantSelect = {
  sku: true,
  size: true,
  color: true,
  price: true,
  product: { select: { name: true, isActive: true, categoryId: true } },
} satisfies Prisma.ProductVariantSelect

export interface OrderLine {
  variantId: string
  quantity: number
  variant: Prisma.ProductVariantGetPayload<{ select: typeof lineVariantSelect }>
}

export type LinesResult =
  | { ok: true; cartId: string | null; lines: OrderLine[] }
  | { ok: false; reason: "EMPTY" | "VARIANT_NOT_FOUND" }

export async function loadOrderLines(tx: Prisma.TransactionClient, userId: string, source?: OrderSource): Promise<LinesResult> {
  if (source?.buyNow) {
    const v = await tx.productVariant.findUnique({ where: { id: source.buyNow.variantId }, select: lineVariantSelect })
    if (!v) return { ok: false, reason: "VARIANT_NOT_FOUND" }
    return { ok: true, cartId: null, lines: [{ variantId: source.buyNow.variantId, quantity: source.buyNow.quantity, variant: v }] }
  }

  const cart = await tx.cart.findFirst({ where: { userId }, select: { id: true } })
  if (!cart) return { ok: false, reason: "EMPTY" }
  const rows = await tx.cartItem.findMany({
    where: { cartId: cart.id, ...(source?.items ? { variantId: { in: source.items } } : {}) },
    select: { variantId: true, quantity: true, variant: { select: lineVariantSelect } },
  })
  if (rows.length === 0) return { ok: false, reason: "EMPTY" }
  return { ok: true, cartId: cart.id, lines: rows }
}
