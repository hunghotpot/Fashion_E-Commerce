"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/cn"
import { SITE_NAME } from "@/lib/site"

// Wordmark chữ serif, in hoa giãn chữ; bản inverted dùng trên nền ink.
// Đang ở trang chủ mà bấm logo thì cuộn lên đầu NGAY (không đi vòng qua server như một lần chuyển trang cùng URL, vốn chậm và khiến phải bấm nhiều lần).
export function Logo({
  inverted = false,
  href = "/",
  className,
}: {
  inverted?: boolean
  href?: string
  className?: string
}) {
  const pathname = usePathname()
  return (
    <Link
      href={href}
      aria-label={`${SITE_NAME} - Trang chủ`}
      onClick={(e) => {
        if (href !== "/" || pathname !== "/" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        if (location.hash) history.replaceState(null, "", "/")
        window.scrollTo({ top: 0 })
      }}
      className={cn(
        "inline-flex h-9 pointer-coarse:h-11 shrink-0 items-center justify-center rounded-sm font-heading text-lg font-semibold tracking-[0.12em] whitespace-nowrap uppercase sm:text-xl sm:tracking-[0.18em] outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        inverted ? "text-white" : "text-ink",
        className
      )}
    >
      {SITE_NAME}
    </Link>
  )
}
