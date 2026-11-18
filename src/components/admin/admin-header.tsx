import { SearchIcon } from "lucide-react"
import { AdminNotificationBell } from "@/components/admin/admin-notification-bell"
import { Logo } from "@/components/layout/logo"
import type { AdminNotificationList } from "@/lib/admin-notification"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "").slice(0, 2)
  return letters.toUpperCase() || "AD"
}

// Logo ink + nhãn ADMIN (pill brand) bên trái; ô tìm kiếm pill, chuông có chấm đỏ, avatar tròn ink + tên bên phải.
// Ô tìm kiếm chuyển sang danh sách đơn (?q=); chuông là hộp thư sự kiện của Admin (AdminNotificationBell).
export function AdminHeader({ user, notifications }: { user: { name: string }; notifications: AdminNotificationList }) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-4">
      <Logo href="/admin" />
      <span className="inline-flex h-8 items-center rounded-none bg-brand px-4 text-caption font-semibold text-white uppercase">Admin</span>

      <div className="ml-auto flex items-center gap-3">
        <form action="/admin/orders" role="search" className="relative hidden md:block">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <input
            name="q"
            type="search"
            placeholder="Tìm kiếm đơn, khách hàng..."
            aria-label="Tìm kiếm đơn hàng"
            className="h-10 pointer-coarse:h-11 w-72 rounded-none border-0 bg-secondary pr-4 pl-10 text-label outline-none placeholder:text-subtle-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </form>

        <AdminNotificationBell data={notifications} />

        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-ink text-caption font-semibold text-white" aria-hidden>
            {initials(user.name)}
          </span>
          <span className="hidden text-label font-semibold sm:block">{user.name}</span>
        </div>
      </div>
    </header>
  )
}
