import Link from "next/link"
import { cn } from "@/lib/cn"
import { SITE_NAME } from "@/lib/site"

// Wordmark chữ serif, in hoa giãn chữ; bản inverted dùng trên nền ink.
export function Logo({
  inverted = false,
  href = "/",
  className,
}: {
  inverted?: boolean
  href?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      aria-label={`${SITE_NAME} - Trang chủ`}
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
