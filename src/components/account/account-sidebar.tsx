import { LogOutIcon } from "lucide-react"
import { logoutAction } from "@/app/actions/auth"
import { AccountNav } from "@/components/account/account-nav"
import { AvatarPicker } from "@/components/account/avatar-picker"
import { Badge } from "@/components/ui/badge"
import { TierBadge } from "@/components/account/tier-badge"
import { TierProgress } from "@/components/account/tier-progress"
import { CUSTOMER_TIER_LABEL, customerTier, spendToNextTier, type TierRules } from "@/lib/customer-tier"
import { formatVnd } from "@/lib/format"
import type { PublicUser } from "@/server/services/auth.service"

// Card bo lớn — avatar tròn ink, tên, email, nhãn, menu, nút Đăng xuất nền hồng nhạt.
// Nhãn của khách là HẠNG THẬT suy ra từ tổng chi tiêu (đơn đã thanh toán hoặc đã giao, xem customer-tier.ts); tài khoản Admin hiện "QUẢN TRỊ VIÊN".
export function AccountSidebar({ user, orderCount, totalSpend, tierRules }: { user: PublicUser; orderCount: number; totalSpend: number; tierRules?: TierRules }) {
  const tier = customerTier(totalSpend, tierRules)
  const next = spendToNextTier(totalSpend, tierRules)
  return (
    <aside className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-8 lg:self-start">
      <div className="flex flex-col items-center gap-3 border-b border-border pb-6 text-center">
        <AvatarPicker name={user.name} avatar={user.avatar} />
        <p className="mt-2 text-lg font-semibold">{user.name}</p>
        <p className="text-xs break-all text-muted-foreground">{user.email}</p>
        {user.role === "ADMIN" ? (
          <Badge variant="dark" className="h-8 px-5">
            QUẢN TRỊ VIÊN
          </Badge>
        ) : (
          <TierBadge tier={tier} className="h-8 px-5" />
        )}
        {user.role === "CUSTOMER" && (
          <p className="text-xs text-muted-foreground">
            {next
              ? `Đã chi tiêu ${formatVnd(totalSpend)}. Còn ${formatVnd(next.remaining)} nữa để lên hạng ${CUSTOMER_TIER_LABEL[next.tier]}.`
              : `Bạn đã chi tiêu ${formatVnd(totalSpend)}, đạt hạng ${CUSTOMER_TIER_LABEL[tier]} (cao nhất).`}
          </p>
        )}
        {user.role === "CUSTOMER" && <TierProgress totalSpend={totalSpend} rules={tierRules} className="mt-1" />}
      </div>

      <AccountNav orderCount={orderCount} />

      <form action={logoutAction} className="border-t border-border pt-6">
        <button
          type="submit"
          className="flex h-[52px] w-full items-center gap-4 rounded-xl bg-destructive-soft px-5 text-sm font-semibold text-destructive transition-colors outline-none hover:bg-destructive/15 focus-visible:ring-3 focus-visible:ring-destructive/20"
        >
          <LogOutIcon className="size-5" /> Đăng xuất
        </button>
      </form>
    </aside>
  )
}
