import { z } from "zod"
import { CUSTOMER_TIERS } from "@/lib/customer-tier"
import { VOUCHER_TYPES, vnDayBoundary } from "@/lib/voucher"

export const VOUCHER_AUDIENCES = ["ALL", "TIER", "USERS"] as const
export type VoucherAudienceValue = (typeof VOUCHER_AUDIENCES)[number]

const dateField = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(vnDayBoundary(v, "start").getTime())), `${label} không hợp lệ`)
    .transform((v) => (v === "" ? null : v))

const money = (label: string) => z.number({ error: `${label} không hợp lệ` }).int(`${label} phải là số nguyên`).min(0, `${label} không được âm`).max(1_000_000_000, `${label} quá lớn`)

/** Dữ liệu Admin nhập khi tạo/sửa voucher. Số do form đổi sẵn thành number (ô trống = null). */
export const voucherInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, "").toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Mã chỉ gồm chữ không dấu, số, gạch ngang/dưới, dài 3-30 ký tự")),
    name: z.string().trim().min(1, "Vui lòng nhập tên chương trình").max(100, "Tên chương trình tối đa 100 ký tự"),
    type: z.enum(VOUCHER_TYPES, { error: "Vui lòng chọn loại giảm giá" }),
    value: money("Mức giảm").min(1, "Mức giảm phải lớn hơn 0"),
    maxDiscount: money("Mức giảm tối đa").min(1, "Mức giảm tối đa phải lớn hơn 0").nullable(),
    minOrder: money("Giá trị đơn tối thiểu").default(0),
    categoryId: z.string().trim().max(64).nullable().transform((v) => v || null),
    firstOrderOnly: z.boolean().default(false),
    usageLimit: z.number({ error: "Hạn mức không hợp lệ" }).int("Hạn mức phải là số nguyên").min(1, "Hạn mức tối thiểu là 1").max(10_000_000, "Hạn mức quá lớn").nullable(),
    startsAt: dateField("Ngày bắt đầu"),
    expiresAt: dateField("Ngày hết hạn"),
    isActive: z.boolean().default(true),
    /** Ai được dùng: mọi khách, khách từ hạng `minTier` trở lên, hoặc chỉ khách được gán (`userIds` và/hoặc tự cấp khi lên `welcomeTier`). */
    audience: z.enum(VOUCHER_AUDIENCES, { error: "Đối tượng áp dụng không hợp lệ" }).default("ALL"),
    minTier: z.enum(CUSTOMER_TIERS).nullable().default(null),
    welcomeTier: z.enum(CUSTOMER_TIERS).nullable().default(null),
    userIds: z.array(z.string().trim().min(1).max(64)).max(200, "Tối đa 200 khách được gán trực tiếp").default([]),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "TIER" && (!v.minTier || v.minTier === "MEMBER")) {
      ctx.addIssue({ code: "custom", path: ["minTier"], message: "Hãy chọn hạng từ Bạc trở lên" })
    }
    if (v.audience === "USERS" && v.userIds.length === 0 && !v.welcomeTier) {
      ctx.addIssue({ code: "custom", path: ["userIds"], message: "Chọn ít nhất một khách hoặc chọn hạng để tự cấp khi khách lên hạng" })
    }
    if (v.type === "PERCENT" && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Phần trăm giảm tối đa là 100" })
    if (v.startsAt && v.expiresAt && v.expiresAt < v.startsAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Ngày hết hạn phải sau ngày bắt đầu" })
    }
  })
  .transform((v) => ({
    ...v,
    maxDiscount: v.type === "PERCENT" ? v.maxDiscount : null,
    minTier: v.audience === "TIER" ? v.minTier : null,
    welcomeTier: v.audience === "USERS" ? v.welcomeTier : null,
    userIds: v.audience === "USERS" ? [...new Set(v.userIds)] : [],
  }))

export type VoucherInput = z.input<typeof voucherInputSchema>
export type VoucherData = z.output<typeof voucherInputSchema>

export const voucherListQuerySchema = z.object({
  q: z.string().trim().max(60).default(""),
  status: z.enum(["", "active", "upcoming", "expired", "disabled"]).catch("").default(""),
  page: z.coerce.number().int().min(1).catch(1).default(1),
})
