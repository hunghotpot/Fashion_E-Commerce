"use client"

import { useState } from "react"
import Link from "next/link"
import { Popover } from "@base-ui/react/popover"
import { BellIcon } from "lucide-react"
import { markAdminNotificationsSeenAction } from "@/app/actions/admin-notifications"
import { AdminNotificationRow } from "@/components/admin/admin-notification-row"
import { useAdminAction } from "@/components/admin/use-admin-action"
import {
  ADMIN_NOTIFICATION_CATEGORIES,
  ADMIN_NOTIFICATION_CATEGORY_LABEL,
  type AdminNotificationCategoryValue,
  type AdminNotificationList,
} from "@/lib/admin-notification"
import { cn } from "@/lib/cn"

type Filter = AdminNotificationCategoryValue | "ALL"

const chip = (active: boolean) =>
  cn(
    "h-10 shrink-0 border px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
    active ? "border-ink bg-ink text-white" : "border-border bg-card text-sidebar-foreground hover:bg-secondary"
  )

/**
 * Chuông Admin: hộp thư sự kiện (đơn mới/huỷ, chờ xác nhận chuyển khoản, VNPay, sắp hết hàng). Dữ liệu do layout nạp sẵn (server);
 * "Đánh dấu đã đọc" gọi Server Action rồi làm mới trang. Lọc theo loại ngay trên 20 thông báo mới nhất; xem đủ ở /admin/notifications.
 */
export function AdminNotificationBell({ data }: { data: AdminNotificationList }) {
  const [filter, setFilter] = useState<Filter>("ALL")
  const { pending, run } = useAdminAction()
  const items = filter === "ALL" ? data.items : data.items.filter((n) => n.category === filter)
  const badge = data.unread > 9 ? "9+" : String(data.unread)

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={data.unread > 0 ? `Thông báo, ${data.unread} chưa đọc` : "Thông báo"}
        className="relative grid size-10 pointer-coarse:size-11 place-items-center rounded-full bg-secondary text-sidebar-foreground outline-none hover:bg-border focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:bg-ink data-popup-open:text-white"
      >
        <BellIcon className="size-5" aria-hidden />
        {data.unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-2xs leading-none font-semibold text-white ring-2 ring-card"
          >
            {badge}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner align="end" sideOffset={8} className="isolate z-50 outline-none">
          <Popover.Popup className="w-[min(26rem,calc(100vw-2rem))] origin-(--transform-origin) overflow-hidden bg-popover text-popover-foreground shadow-float ring-1 ring-border duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <Popover.Title className="font-heading text-xl font-semibold">Thông báo</Popover.Title>
              {data.unread > 0 && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => markAdminNotificationsSeenAction())}
                  className="text-xs font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            <div role="group" aria-label="Lọc theo loại" className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3">
              <button type="button" aria-pressed={filter === "ALL"} className={chip(filter === "ALL")} onClick={() => setFilter("ALL")}>
                Tất cả
              </button>
              {ADMIN_NOTIFICATION_CATEGORIES.map((c) => (
                <button key={c} type="button" aria-pressed={filter === c} className={chip(filter === c)} onClick={() => setFilter(c)}>
                  {ADMIN_NOTIFICATION_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                  <BellIcon className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold">Chưa có thông báo nào</p>
                <p className="text-xs text-muted-foreground">Đơn mới, chuyển khoản chờ xác nhận và hàng sắp hết sẽ báo ở đây.</p>
              </div>
            ) : (
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {items.map((n) => (
                  <AdminNotificationRow key={n.id} n={n} variant="bell" />
                ))}
              </ul>
            )}

            <Link
              href={filter === "ALL" ? "/admin/notifications" : `/admin/notifications?category=${filter}`}
              className="block border-t border-border px-4 py-3 text-center text-xs font-semibold outline-none hover:bg-secondary focus-visible:bg-secondary"
            >
              Xem tất cả thông báo
            </Link>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
