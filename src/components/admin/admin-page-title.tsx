"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { activeAdminNav } from "@/components/admin/admin-nav"

// Breadcrumb "Bảng điều khiển / <trang>" (mục cuối đậm) rồi tiêu đề 28px bold, nằm phía trên sidebar.
export function AdminPageTitle() {
  const item = activeAdminNav(usePathname())

  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/admin" className="inline-block py-2 hover:text-foreground">
          Bảng điều khiển
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-foreground">{item.crumb}</span>
      </nav>
      <h1 className="text-4xl font-semibold">{item.title}</h1>
    </div>
  )
}
