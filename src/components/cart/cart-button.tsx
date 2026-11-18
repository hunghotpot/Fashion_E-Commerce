"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingCartIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { useCart } from "@/hooks/use-cart"
import { useCartUi } from "@/stores/cart-ui"

// Icon giỏ ở header + badge (chỉ hiện khi đã đăng nhập). Bấm mở drawer (Ctrl/Cmd+click hoặc khi chưa có JS vẫn đi tới /cart).
export function CartButton() {
  const { data } = useCart()
  const setOpen = useCartUi((s) => s.setOpen)
  const count = data?.itemCount ?? 0
  const badge = count > 99 ? "99+" : String(count)

  // Thêm hàng (số lượng tăng): giỏ nảy lên, số đếm bật ra. Điều chỉnh state ngay khi render để không cần effect.
  const [prevCount, setPrevCount] = useState(count)
  const [bump, setBump] = useState(0)
  if (count !== prevCount) {
    setPrevCount(count)
    if (count > prevCount) setBump((b) => b + 1)
  }

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Giỏ hàng, ${count} sản phẩm` : "Giỏ hàng"}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        setOpen(true)
      }}
      className={`${buttonVariants({ variant: "secondary", size: "icon-sm" })} relative overflow-visible`}
    >
      <span key={`i${bump}`} aria-hidden className={cn("inline-flex", bump > 0 && "cart-bump")}>
        <ShoppingCartIcon />
      </span>
      {count > 0 && (
        <span
          key={`b${bump}`}
          aria-hidden
          className={`${bump > 0 ? "badge-pop " : ""}absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-2xs leading-none font-semibold text-primary-foreground`}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

