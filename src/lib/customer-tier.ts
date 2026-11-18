/*
 * Hạng khách hàng. Không lưu cột: suy ra từ tổng chi tiêu của các đơn ĐÃ THANH TOÁN hoặc ĐÃ GIAO (không tính đơn huỷ,
 * đơn đang chờ), xem `PAID_SPEND_WHERE` ở server/services/customer-spend.ts. Bốn hạng; thêm hạng = thêm một dòng ở
 * CUSTOMER_TIERS, CUSTOMER_TIER_CONFIG, CUSTOMER_TIER_STYLE (và enum CustomerTier trong schema Prisma).
 */

export const CUSTOMER_TIERS = ["MEMBER", "SILVER", "GOLD", "DIAMOND"] as const
export type CustomerTier = (typeof CUSTOMER_TIERS)[number]

export interface CustomerTierConfig {
  label: string
  /** Tổng chi tiêu (VND) từ mức này trở lên là hạng này. */
  minSpend: number
  /** Đơn từ mức tiền hàng này được miễn phí vận chuyển (0 = luôn miễn phí). */
  freeShippingThreshold: number
}

/** Phần số liệu của hạng mà Admin chỉnh được (bảng ShopSettings); mặc định là CUSTOMER_TIER_CONFIG. */
export type TierRules = Record<CustomerTier, Pick<CustomerTierConfig, "minSpend" | "freeShippingThreshold">>

/** Giá trị MẶC ĐỊNH (khi Admin chưa cấu hình). Tên hạng cố định ở đây. */
export const CUSTOMER_TIER_CONFIG: Record<CustomerTier, CustomerTierConfig> = {
  MEMBER: { label: "Thành viên", minSpend: 0, freeShippingThreshold: 500_000 },
  SILVER: { label: "Bạc", minSpend: 3_000_000, freeShippingThreshold: 400_000 },
  GOLD: { label: "Vàng", minSpend: 10_000_000, freeShippingThreshold: 300_000 },
  DIAMOND: { label: "Kim cương", minSpend: 25_000_000, freeShippingThreshold: 0 },
}

export const CUSTOMER_TIER_LABEL: Record<CustomerTier, string> = {
  MEMBER: CUSTOMER_TIER_CONFIG.MEMBER.label,
  SILVER: CUSTOMER_TIER_CONFIG.SILVER.label,
  GOLD: CUSTOMER_TIER_CONFIG.GOLD.label,
  DIAMOND: CUSTOMER_TIER_CONFIG.DIAMOND.label,
}

/**
 * Màu riêng của từng hạng (lớp Tailwind theo token, không viết mã màu cứng): xám kem, trắng viền xám (bạc),
 * vàng đồng (như VIP trước đây), nền đen chữ trắng (kim cương).
 */
export const CUSTOMER_TIER_STYLE: Record<CustomerTier, { chip: string; dot: string }> = {
  MEMBER: { chip: "bg-secondary text-sidebar-foreground", dot: "bg-subtle-foreground" },
  SILVER: { chip: "bg-card text-foreground ring-1 ring-inset ring-border-strong", dot: "bg-muted-foreground" },
  GOLD: { chip: "bg-brand-soft text-brand-strong", dot: "bg-brand" },
  DIAMOND: { chip: "bg-ink text-white", dot: "bg-brand-soft" },
}

export const tierRank = (tier: CustomerTier): number => CUSTOMER_TIERS.indexOf(tier)

/** `tier` có đạt hoặc vượt `min` không. */
export const tierAtLeast = (tier: CustomerTier, min: CustomerTier): boolean => tierRank(tier) >= tierRank(min)

export function customerTier(totalSpend: number, rules: TierRules = CUSTOMER_TIER_CONFIG): CustomerTier {
  let result: CustomerTier = "MEMBER"
  for (const t of CUSTOMER_TIERS) if (totalSpend >= rules[t].minSpend) result = t
  return result
}

/** Hạng kế tiếp (null nếu đã cao nhất). */
export function nextTier(tier: CustomerTier): CustomerTier | null {
  return CUSTOMER_TIERS[tierRank(tier) + 1] ?? null
}

/** Hạng kế tiếp và số tiền còn thiếu để lên hạng đó; null nếu đã ở hạng cao nhất. */
export function spendToNextTier(totalSpend: number, rules: TierRules = CUSTOMER_TIER_CONFIG): { tier: CustomerTier; remaining: number } | null {
  const next = nextTier(customerTier(totalSpend, rules))
  return next ? { tier: next, remaining: Math.max(0, rules[next].minSpend - totalSpend) } : null
}

/** Ngưỡng miễn phí vận chuyển của hạng. */
export const freeShippingThresholdFor = (tier: CustomerTier, rules: TierRules = CUSTOMER_TIER_CONFIG): number => rules[tier].freeShippingThreshold

/** Các hạng từ `min` trở lên (dùng cho voucher theo hạng). */
export const tiersFrom = (min: CustomerTier): CustomerTier[] => CUSTOMER_TIERS.filter((t) => tierAtLeast(t, min))
