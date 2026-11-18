"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { NAV_LINKS } from "@/components/layout/nav-links"

// Menu giữa header, chỉ hiện từ màn xl (nhỏ hơn thì dùng nút ba gạch). Mục đang mở (Giới thiệu) có aria-current và gạch chân.
export function SiteNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Menu chính" className="mx-auto hidden items-center gap-7 xl:flex">
      {NAV_LINKS.map((l) => {
        const current = pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={current ? "page" : undefined}
            className="inline-flex min-h-11 items-center border-b-2 border-transparent pt-0.5 text-label font-semibold outline-none hover:border-brand focus-visible:ring-3 focus-visible:ring-ring/40 aria-[current=page]:border-brand"
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
