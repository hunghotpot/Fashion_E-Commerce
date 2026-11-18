import { z } from "zod"
import { findBank } from "@/lib/banks"

/** Bỏ dấu tiếng Việt, IN HOA: tên chủ tài khoản trên VietQR/ngân hàng luôn dạng không dấu. */
const toBankName = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()

/** Tài khoản nhận chuyển khoản (VietQR). `bankBin` phải thuộc danh sách ngân hàng hỗ trợ. */
export const paymentAccountSchema = z.object({
  bankBin: z.string().refine((v) => !!findBank(v), "Vui lòng chọn ngân hàng trong danh sách"),
  accountNo: z
    .string()
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{6,19}$/, "Số tài khoản gồm 6 đến 19 chữ số")),
  accountName: z
    .string()
    .transform(toBankName)
    .pipe(z.string().regex(/^[A-Z0-9 .'\-]{2,60}$/, "Tên chủ tài khoản chỉ gồm chữ, số và khoảng trắng (2-60 ký tự)")),
})

export type PaymentAccountInput = z.input<typeof paymentAccountSchema>
