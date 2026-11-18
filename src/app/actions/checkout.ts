"use server"

import { fieldErrorsByPath } from "@/lib/action-result"
import { checkoutSchema } from "@/lib/validators/checkout"
import { validateAddressUnits } from "@/server/address/units"
import { getCurrentUser } from "@/server/auth/session"
import { createOrder, OrderError } from "@/server/services/order.service"
import { VoucherError } from "@/server/services/voucher.service"
import type { StockShortage } from "@/types/order"

export type PlaceOrderResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false
      code?: "OUT_OF_STOCK" | "EMPTY_CART" | "VOUCHER_INVALID"
      message?: string
      fieldErrors?: Record<string, string>
      shortages?: StockShortage[]
    }

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }

  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsByPath(parsed.error) }
  const { shipping, paymentMethod, note, voucherCodes, source } = parsed.data
  // Địa chỉ mới: phường/xã phải thuộc đúng tỉnh/thành trong danh sách chuẩn (khoá lỗi theo đường dẫn để form hiện đúng ô).
  if (shipping.mode === "new") {
    const bad = validateAddressUnits(shipping.address)
    if (bad) return { ok: false, fieldErrors: Object.fromEntries(Object.entries(bad).map(([k, v]) => [`shipping.address.${k}`, v])) }
  }

  try {
    const order = await createOrder(user, {
      addressId: shipping.mode === "saved" ? shipping.addressId : undefined,
      newAddress: shipping.mode === "new" ? shipping.address : undefined,
      paymentMethod,
      note,
      voucherCodes,
      source,
    })
    // Chuyển khoản → trang quét mã; COD → trang thành công.
    const next = paymentMethod === "BANK_TRANSFER" ? "payment" : "success"
    return { ok: true, redirectTo: `/orders/${order.id}/${next}` }
  } catch (e) {
    // Voucher không dùng được lúc đặt đơn (hết lượt, hết hạn, giỏ đổi…): đơn chưa được tạo, báo lý do để khách bỏ mã hoặc đổi.
    if (e instanceof VoucherError) return { ok: false, code: "VOUCHER_INVALID", message: e.message }
    if (e instanceof OrderError) {
      if (e.code === "OUT_OF_STOCK") return { ok: false, code: "OUT_OF_STOCK", message: e.message, shortages: e.shortages }
      if (e.code === "EMPTY_CART") return { ok: false, code: "EMPTY_CART", message: e.message }
      return { ok: false, message: e.message }
    }
    throw e
  }
}

