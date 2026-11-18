import { cn } from "@/lib/cn"
import { CUSTOMER_TIER_LABEL, customerTier, nextTier, type TierRules } from "@/lib/customer-tier"
import { formatVnd } from "@/lib/format"
import { DEFAULT_SHOP_SETTINGS } from "@/lib/shop-settings"

/**
 * Thanh tiến độ lên hạng: tô theo phần đã đi từ mốc hạng hiện tại tới mốc hạng kế tiếp (mốc lấy từ cấu hình Admin).
 * Ở hạng cao nhất thì thanh đầy. Đọc được bằng trình đọc màn hình qua role="progressbar".
 */
export function TierProgress({ totalSpend, rules = DEFAULT_SHOP_SETTINGS.tiers, className }: { totalSpend: number; rules?: TierRules; className?: string }) {
  const tier = customerTier(totalSpend, rules)
  const next = nextTier(tier)
  const from = rules[tier].minSpend
  const to = next ? rules[next].minSpend : from
  const percent = next ? Math.min(100, Math.max(0, Math.round(((totalSpend - from) / (to - from)) * 100))) : 100
  const text = next
    ? `Đã đi ${percent}% từ hạng ${CUSTOMER_TIER_LABEL[tier]} tới hạng ${CUSTOMER_TIER_LABEL[next]}`
    : `Hạng ${CUSTOMER_TIER_LABEL[tier]} là hạng cao nhất`

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span>{CUSTOMER_TIER_LABEL[tier]}</span>
        <span>{next ? CUSTOMER_TIER_LABEL[next] : "Cao nhất"}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={text}
        aria-label="Tiến độ lên hạng thành viên"
        className="mt-1.5 h-2 w-full overflow-hidden bg-secondary"
      >
        <div className="h-full bg-brand transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-2xs text-muted-foreground">
        <span>{formatVnd(from)}</span>
        <span>{next ? formatVnd(to) : formatVnd(totalSpend)}</span>
      </div>
    </div>
  )
}
