"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleHelpIcon, MapPinIcon, ShoppingBagIcon, TicketPercentIcon, UserRoundIcon } from "lucide-react"
import { cn } from "@/lib/cn"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
  /** Chưa có trang tương ứng: hiện theo thiết kế nhưng chưa bấm được. */
  soon?: boolean
}

// Mục đang chọn nền ink + chấm trắng; các mục khác icon viền; số đơn hàng ở badge bên phải.
export function AccountNav({ orderCount }: { orderCount: number }) {
  const pathname = usePathname()
  const items: NavItem[] = [
    { href: "/account/profile", label: "Thông tin tài khoản", icon: UserRoundIcon },
    { href: "/account/addresses", label: "Sổ địa chỉ", icon: MapPinIcon },
    { href: "/account/orders", label: "Đơn hàng của tôi", icon: ShoppingBagIcon, count: orderCount },
    { href: "/account/vouchers", label: "Voucher của tôi", icon: TicketPercentIcon },
    { href: "/help", label: "Trung tâm trợ giúp", icon: CircleHelpIcon, soon: true },
  ]

  return (
    <nav aria-label="Tài khoản" className="flex flex-col gap-2">
      {items.map(({ href, label, icon: Icon, count, soon }) => {
        const active = pathname === href
        const className = cn(
          "flex h-[52px] items-center gap-4 rounded-xl px-5 text-sm font-semibold transition-colors",
          active ? "bg-ink text-white" : "text-sidebar-foreground",
          !active && !soon && "hover:bg-secondary",
          soon && "cursor-not-allowed opacity-60"
        )
        const content = (
          <>
            {active ? <span aria-hidden className="mx-1.5 size-2.5 rounded-full bg-card" /> : <Icon className="size-5" />}
            <span className="flex-1">{label}</span>
            {count !== undefined && (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-secondary px-2 text-2xs text-foreground">
                {count}
              </span>
            )}
          </>
        )
        return soon ? (
          <span key={href} aria-disabled="true" title="Sắp ra mắt" className={className}>
            {content}
          </span>
        ) : (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={className}>
            {content}
          </Link>
        )
      })}
    </nav>
  )
}

