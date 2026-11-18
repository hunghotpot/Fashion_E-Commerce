import { cn } from "@/lib/cn"
import { CUSTOMER_TIER_STYLE, type CustomerTier } from "@/lib/customer-tier"

/** Avatar chữ cái đầu: màu theo hạng (CUSTOMER_TIER_STYLE), khách bị khóa nền đỏ nhạt. */
export function CustomerAvatar({
  initial,
  tier,
  locked,
  className,
}: {
  initial: string
  tier: CustomerTier
  locked: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full text-sm font-semibold",
        locked ? "bg-destructive-soft text-destructive" : CUSTOMER_TIER_STYLE[tier].chip,
        className
      )}
    >
      {initial}
    </span>
  )
}
