import { z } from "zod"
import { MAX_LINE_QUANTITY } from "@/lib/cart"

/*
 * Nguồn hàng của một lần thanh toán. Dùng chung cho xem trước voucher, trang thanh toán và đặt đơn để ba nơi luôn khớp:
 * - không có gì: toàn bộ giỏ hàng;
 * - `items`: chỉ các dòng giỏ được chọn (theo variantId); dòng không chọn ở lại trong giỏ;
 * - `buyNow`: mua ngay một biến thể với số lượng cho trước, KHÔNG đọc và KHÔNG đụng giỏ.
 */
const id = z.string().trim().min(1).max(64)

export const orderSourceSchema = z
  .object({
    items: z.array(id).min(1, "Chưa chọn sản phẩm nào").max(100).optional(),
    buyNow: z
      .object({
        variantId: id,
        quantity: z.number().int(`Số lượng phải từ 1 đến ${MAX_LINE_QUANTITY}`).min(1, `Số lượng phải từ 1 đến ${MAX_LINE_QUANTITY}`).max(MAX_LINE_QUANTITY, `Số lượng phải từ 1 đến ${MAX_LINE_QUANTITY}`),
      })
      .optional(),
  })
  .refine((v) => !(v.items && v.buyNow), { message: "Chỉ chọn một nguồn hàng", path: ["buyNow"] })

export type OrderSource = z.infer<typeof orderSourceSchema>

/** Query của trang thanh toán ↔ nguồn hàng. `?items=a,b` hoặc `?buyNow=<variantId>&qty=2`; không có = cả giỏ. */
export function sourceToQuery(source: OrderSource | undefined): string {
  if (source?.buyNow) return `?buyNow=${encodeURIComponent(source.buyNow.variantId)}&qty=${source.buyNow.quantity}`
  if (source?.items?.length) return `?items=${source.items.map(encodeURIComponent).join(",")}`
  return ""
}

export function sourceFromQuery(q: { items?: string | string[]; buyNow?: string | string[]; qty?: string | string[] }): OrderSource | undefined {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const buyNow = one(q.buyNow)
  if (buyNow) {
    const quantity = Number.parseInt(one(q.qty) ?? "1", 10)
    return { buyNow: { variantId: buyNow, quantity: Number.isNaN(quantity) ? 1 : Math.min(Math.max(quantity, 1), MAX_LINE_QUANTITY) } }
  }
  const items = one(q.items)
  if (items) {
    const list = items.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100)
    if (list.length > 0) return { items: list }
  }
  return undefined
}
