import { z } from "zod"
import { PAYMENT_METHODS } from "@/lib/order"
import { orderSourceSchema } from "@/lib/order-source"
import { addressSchema } from "@/lib/validators/auth"

// Địa chỉ nhận hàng: chọn từ sổ địa chỉ HOẶC nhập địa chỉ mới (sẽ được lưu vào sổ địa chỉ).
const shippingSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("saved"),
    addressId: z.string().min(1, "Vui lòng chọn địa chỉ nhận hàng").max(64),
  }),
  z.object({
    mode: z.literal("new"),
    address: addressSchema,
  }),
])

export const checkoutSchema = z.object({
  /** Nguồn hàng: bỏ trống = cả giỏ; xem src/lib/order-source.ts. */
  source: orderSourceSchema.optional(),
  shipping: shippingSchema,
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Vui lòng chọn phương thức thanh toán" }),
  /** Tối đa hai mã: một mã giảm giá + một mã vận chuyển (server kiểm nhóm và điều kiện). */
  voucherCodes: z.array(z.string().trim().min(1).max(40, "Mã giảm giá không hợp lệ")).max(2, "Mỗi đơn dùng tối đa hai mã").optional(),
  note: z
    .string()
    .trim()
    .max(500, "Ghi chú tối đa 500 ký tự")
    .optional()
    .transform((v) => v || undefined),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
