import { z } from "zod"

/** Chuỗi tuỳ chọn: cắt khoảng trắng, rỗng → null. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} tối đa ${max} ký tự`)
    .transform((v) => (v === "" ? null : v))

/** Thông tin cửa hàng hiển thị cho khách. Mọi trường đều tuỳ chọn; trống nghĩa là "chưa có thông tin". */
export const storeProfileSchema = z.object({
  hotline: optionalText(30, "Hotline").refine((v) => v === null || /^[0-9 +().-]{6,30}$/.test(v), "Hotline chỉ gồm số, khoảng trắng và + ( ) . -"),
  email: optionalText(120, "Email").refine((v) => v === null || z.string().email().safeParse(v).success, "Email không hợp lệ"),
  address: optionalText(200, "Địa chỉ"),
  about: optionalText(4000, "Giới thiệu"),
})

export type StoreProfileInput = z.input<typeof storeProfileSchema>
