"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleHelpIcon, HeartIcon, MapPinIcon, ShoppingBagIcon, TicketPercentIcon, UserRoundIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { useFilterPending } from "@/stores/product-filter-pending"

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
  const setPending = useFilterPending((s) => s.setPending)
  // Mục vừa bấm (và trang đang đứng lúc bấm): đổi trạng thái "đang chọn" ngay, không chờ server trả trang mới.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null)
  const target = clicked && clicked.from === pathname ? clicked.href : pathname
  useEffect(() => {
    setPending(target !== pathname)
    if (target === pathname) return
    const t = setTimeout(() => setPending(false), 10_000) // phòng khi chuyển trang lỗi: không mờ mãi
    return () => clearTimeout(t)
  }, [target, pathname, setPending])
  useEffect(() => () => setPending(false), [setPending])
  const items: NavItem[] = [
    { href: "/account/profile", label: "Thông tin tài khoản", icon: UserRoundIcon },
    { href: "/account/addresses", label: "Sổ địa chỉ", icon: MapPinIcon },
    { href: "/account/orders", label: "Đơn hàng của tôi", icon: ShoppingBagIcon, count: orderCount },
    { href: "/account/vouchers", label: "Voucher của tôi", icon: TicketPercentIcon },
    { href: "/account/wishlist", label: "Sản phẩm yêu thích", icon: HeartIcon },
    { href: "/help", label: "Trung tâm trợ giúp", icon: CircleHelpIcon, soon: true },
  ]

  return (
    <nav aria-label="Tài khoản" className="flex flex-col gap-2">
      {items.map(({ href, label, icon: Icon, count, soon }) => {
        const active = target === href
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
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={className}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || href === pathname) return
              setClicked({ href, from: pathname })
            }}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}

