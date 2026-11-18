import { formatVnd } from "@/lib/format"

/*
 * Quy tắc voucher: hàm THUẦN dùng chung cho server (đặt đơn, xem trước) và UI (nhãn, trạng thái).
 */

export const VOUCHER_TYPES = ["CASH", "PERCENT", "FREESHIP"] as const
export type VoucherTypeValue = (typeof VOUCHER_TYPES)[number]

/** Phương thức thanh toán được dùng voucher: COD và chuyển khoản (số tiền QR là tổng sau giảm). VNPay chưa mở. */
export const VOUCHER_PAYMENT_METHODS: readonly string[] = ["COD", "BANK_TRANSFER"]

export const VOUCHER_TYPE_LABEL: Record<VoucherTypeValue, string> = {
  CASH: "Tiền mặt (VND)",
  PERCENT: "Theo % đơn hàng",
  FREESHIP: "Freeship",
}

/**
 * Mỗi đơn dùng tối đa HAI mã cùng lúc: một mã GIẢM GIÁ (CASH/PERCENT, trừ vào tiền hàng) và một mã VẬN CHUYỂN (FREESHIP, trừ vào phí ship).
 * Nhóm của mã suy ra từ loại; hai mã cùng nhóm thì không dùng chung được.
 */
export type VoucherSlot = "PRODUCT" | "SHIPPING"
export const VOUCHER_SLOT_LABEL: Record<VoucherSlot, string> = { PRODUCT: "Voucher giảm giá", SHIPPING: "Voucher vận chuyển" }
export const voucherSlot = (type: VoucherTypeValue): VoucherSlot => (type === "FREESHIP" ? "SHIPPING" : "PRODUCT")

export function normalizeVoucherCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase()
}

export interface VoucherRule {
  type: VoucherTypeValue
  value: number
  maxDiscount: number | null
}

/**
 * Số tiền được giảm. `eligibleSubtotal` là tổng tiền các dòng hàng được áp dụng (cả đơn nếu voucher không giới hạn danh mục).
 * CASH/PERCENT trừ vào tiền hàng, FREESHIP trừ vào phí vận chuyển; không bao giờ giảm quá phần được trừ.
 */
export function computeVoucherDiscount(rule: VoucherRule, eligibleSubtotal: number, shippingFee: number): number {
  switch (rule.type) {
    case "CASH":
      return Math.max(0, Math.min(rule.value, eligibleSubtotal))
    case "PERCENT": {
      const raw = Math.floor((eligibleSubtotal * rule.value) / 100)
      return Math.max(0, Math.min(raw, rule.maxDiscount ?? raw, eligibleSubtotal))
    }
    case "FREESHIP":
      return Math.max(0, Math.min(rule.value, shippingFee))
  }
}

/** Mô tả ngắn mức giảm: "Giảm 300.000 ₫", "Giảm 20% (tối đa 500.000 ₫)", "Freeship tối đa 40.000 ₫". */
export function describeVoucherBenefit(rule: VoucherRule): string {
  switch (rule.type) {
    case "CASH":
      return `Giảm ${formatVnd(rule.value)}`
    case "PERCENT":
      return `Giảm ${rule.value}%${rule.maxDiscount ? ` (tối đa ${formatVnd(rule.maxDiscount)})` : ""}`
    case "FREESHIP":
      return `Freeship tối đa ${formatVnd(rule.value)}`
  }
}

export type VoucherStatus = "ACTIVE" | "UPCOMING" | "EXPIRED" | "EXHAUSTED" | "DISABLED"

export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  ACTIVE: "Hoạt động",
  UPCOMING: "Sắp diễn ra",
  EXPIRED: "Đã hết hạn",
  EXHAUSTED: "Hết lượt",
  DISABLED: "Đã tắt",
}

export const VOUCHER_STATUS_TONE = {
  ACTIVE: "success",
  UPCOMING: "info",
  EXPIRED: "neutral",
  EXHAUSTED: "warning",
  DISABLED: "neutral",
} as const

export function voucherStatus(
  v: { isActive: boolean; startsAt: Date | null; expiresAt: Date | null; usageLimit: number | null; usedCount: number },
  now: Date = new Date()
): VoucherStatus {
  if (!v.isActive) return "DISABLED"
  if (v.expiresAt && v.expiresAt < now) return "EXPIRED"
  if (v.usageLimit !== null && v.usedCount >= v.usageLimit) return "EXHAUSTED"
  if (v.startsAt && v.startsAt > now) return "UPCOMING"
  return "ACTIVE"
}

/** Kết quả xem trước voucher trên giỏ/thanh toán. */
export interface VoucherPreview {
  code: string
  slot: VoucherSlot
  name: string
  benefit: string
  /** Số tiền giảm (VND). */
  discount: number
}

export type VoucherPreviewResponse = { ok: true; preview: VoucherPreview } | { ok: false; message: string }

/** Ngày YYYY-MM-DD (giờ Việt Nam, UTC+7): đầu ngày cho startsAt, cuối ngày cho expiresAt. */
export function vnDayBoundary(date: string, edge: "start" | "end"): Date {
  return new Date(`${date}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}+07:00`)
}

export function toVnDateInput(d: Date | null): string {
  if (!d) return ""
  return new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10)
}

/** Một voucher hiển thị dưới ô nhập mã: dùng được cho giỏ hiện tại (`eligible`) hoặc chưa dùng được kèm `reason`. */
export interface AvailableVoucher {
  code: string
  slot: VoucherSlot
  name: string
  benefit: string
  type: VoucherTypeValue
  /** Nhãn ngắn ở ô bên trái thẻ: "50K", "10%", "Ship". */
  stub: string
  /** Điều kiện ngắn ("Đơn từ 300.000 ₫"), rỗng nếu không có. */
  condition: string
  /** ISO, null = không hết hạn. */
  expiresAt: string | null
  eligible: boolean
  /** Số tiền sẽ giảm nếu áp ngay (0 khi chưa dùng được). */
  discount: number
  reason?: string
  /** Giảm nhiều nhất trong các voucher dùng được CÙNG NHÓM (chỉ gắn khi nhóm có từ 2 voucher dùng được trở lên). */
  best?: boolean
}

/** "50K" / "1,2TR" cho ô bên trái thẻ voucher. */
export function voucherStubLabel(rule: VoucherRule): string {
  if (rule.type === "FREESHIP") return "Ship"
  if (rule.type === "PERCENT") return `${rule.value}%`
  if (rule.value >= 1_000_000) return `${Math.round(rule.value / 100_000) / 10}TR`.replace(".", ",")
  return `${Math.round(rule.value / 1000)}K`
}

/** Một voucher trên trang "Voucher của tôi". */
export interface MyVoucher {
  code: string
  name: string
  slot: VoucherSlot
  type: VoucherTypeValue
  benefit: string
  /** Nhãn ngắn ở ô bên trái thẻ: "50K", "10%", "Ship". */
  stub: string
  /** Điều kiện ngắn ("Đơn từ 300.000 ₫"), rỗng nếu không có. */
  condition: string
  /** ISO, null = không hết hạn. */
  expiresAt: string | null
  /** "Cấp riêng cho bạn", "Quà hạng Bạc", "Từ hạng Vàng"; null với voucher công khai. */
  audienceLabel: string | null
  /** Voucher theo hạng nhưng khách chưa đủ hạng: lý do (thẻ hiện khoá). */
  locked?: string
  /** Chỉ voucher đã dùng: ISO lúc dùng và mã đơn đã dùng. */
  usedAt?: string
  orderCode?: string
  /** Chỉ voucher hết hạn. */
  expiredReason?: "Hết hạn" | "Hết lượt"
}

/** Ba nhóm của trang "Voucher của tôi". `usable` gồm cả voucher theo hạng đang khoá (xếp sau cùng, có `locked`). */
export interface MyVouchers {
  usable: MyVoucher[]
  used: MyVoucher[]
  expired: MyVoucher[]
}
