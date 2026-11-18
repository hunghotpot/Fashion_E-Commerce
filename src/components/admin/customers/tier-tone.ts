import type { PillTone } from "@/components/admin/status-pill"
import type { CustomerTier } from "@/lib/customer-tier"

/** Tông StatusPill của từng hạng trong bảng và trang chi tiết khách (Admin). */
export const TIER_PILL_TONE: Record<CustomerTier, PillTone> = {
  MEMBER: "neutral",
  SILVER: "info",
  GOLD: "warning",
  DIAMOND: "dark",
}
