import { UserAvatar } from "@/components/account/user-avatar"
import { avatarSrc, type AvatarData } from "@/lib/avatar"
import { cn } from "@/lib/cn"
import { CUSTOMER_TIER_STYLE, type CustomerTier } from "@/lib/customer-tier"

/**
 * Ảnh đại diện của khách ở Admin: khách đã chọn ảnh (tạo sẵn/tải lên) hoặc màu riêng thì hiện đúng như họ chọn;
 * chưa chọn gì thì giữ chữ cái đầu tô màu theo hạng (CUSTOMER_TIER_STYLE). Khách bị khoá: nền đỏ nhạt hoặc ảnh mờ kèm viền đỏ.
 */
export function CustomerAvatar({
  name,
  avatar,
  tier,
  locked,
  className,
}: {
  name: string
  avatar: AvatarData
  tier: CustomerTier
  locked: boolean
  className?: string
}) {
  const custom = avatarSrc(avatar) !== null || avatar.color !== null
  if (custom) {
    return (
      <UserAvatar
        name={name}
        avatar={avatar}
        className={cn("size-12 shrink-0", locked && "opacity-60 ring-2 ring-destructive ring-inset", className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full text-sm font-semibold",
        locked ? "bg-destructive-soft text-destructive" : CUSTOMER_TIER_STYLE[tier].chip,
        className
      )}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
