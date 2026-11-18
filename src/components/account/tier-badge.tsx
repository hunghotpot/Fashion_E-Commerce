import { cn } from "@/lib/cn"
import { CUSTOMER_TIER_LABEL, CUSTOMER_TIER_STYLE, type CustomerTier } from "@/lib/customer-tier"

/** Nhãn hạng thành viên, màu riêng theo từng hạng (CUSTOMER_TIER_STYLE). Dùng ở menu tài khoản và trang tài khoản. */
export function TierBadge({ tier, className }: { tier: CustomerTier; className?: string }) {
  const style = CUSTOMER_TIER_STYLE[tier]
  return (
    <span className={cn("inline-flex h-7 items-center gap-1.5 px-3 text-2xs font-semibold tracking-wide uppercase", style.chip, className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", style.dot)} />
      {CUSTOMER_TIER_LABEL[tier]}
    </span>
  )
}
