"use client"

import Link from "next/link"
import { LayoutDashboardIcon, LogOutIcon, MapPinIcon, ShoppingBagIcon, TicketPercentIcon, UserRoundIcon } from "lucide-react"
import { logoutAction } from "@/app/actions/auth"
import { TierBadge } from "@/components/account/tier-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/account/user-avatar"
import type { AvatarData } from "@/lib/avatar"
import { CUSTOMER_TIER_LABEL, customerTier, spendToNextTier, type TierRules } from "@/lib/customer-tier"
import { formatVnd } from "@/lib/format"

export interface AccountMenuUser {
  name: string
  email: string
  role: "CUSTOMER" | "ADMIN"
  /** Tổng chi tiêu (không tính đơn huỷ) để hiện hạng thành viên của khách; Admin không cần. */
  totalSpend?: number
  /** Mức chi tiêu từng hạng (cấu hình ở Admin); thiếu thì dùng mặc định. */
  tierRules?: TierRules
  /** Ảnh đại diện (chữ cái đầu, tạo sẵn hoặc tải lên). */
  avatar: AvatarData
}

export function AccountMenu({ user }: { user: AccountMenuUser }) {
  const tier = customerTier(user.totalSpend ?? 0, user.tierRules)
  const next = spendToNextTier(user.totalSpend ?? 0, user.tierRules)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="secondary" size="icon-sm" aria-label={`Tài khoản của ${user.name}`} className="overflow-hidden p-0" />}
      >
        <UserAvatar name={user.name} avatar={user.avatar} className="size-full text-xs" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <UserAvatar name={user.name} avatar={user.avatar} className="mb-1.5 size-12 text-base" />
            <span className="truncate text-sm font-semibold text-foreground">{user.name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            {user.role === "CUSTOMER" && (
              <span className="mt-1.5 flex flex-col items-start gap-1">
                <TierBadge tier={tier} />
                <span className="text-xs font-normal text-muted-foreground">
                  {next ? `Còn ${formatVnd(next.remaining)} nữa để lên hạng ${CUSTOMER_TIER_LABEL[next.tier]}` : "Bạn đang ở hạng cao nhất"}
                </span>
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/account/profile" />}>
          <UserRoundIcon /> Hồ sơ của tôi
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/addresses" />}>
          <MapPinIcon /> Sổ địa chỉ
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/account/orders" />}>
          <ShoppingBagIcon /> Đơn hàng của tôi
        </DropdownMenuItem>
        {user.role === "CUSTOMER" && (
          <DropdownMenuItem render={<Link href="/account/vouchers" />}>
            <TicketPercentIcon /> Voucher của tôi
          </DropdownMenuItem>
        )}
        {user.role === "ADMIN" && (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <LayoutDashboardIcon /> Trang quản trị
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => logoutAction()}>
          <LogOutIcon /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

