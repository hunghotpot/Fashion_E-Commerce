"use client"

import Link from "next/link"
import { Popover } from "@base-ui/react/popover"
import { BellIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { useMarkNotificationsRead, useNotifications } from "@/hooks/use-notifications"
import { formatRelativeTime } from "@/lib/notification"

// Chuông thông báo trên header (chỉ hiện khi đã đăng nhập). Dữ liệu từ /api/notifications; bấm một thông báo hoặc
// "Đánh dấu đã đọc" thì gọi /api/notifications/read. Lỗi tải thì coi như chưa có thông báo, không chặn trang.
export function NotificationButton() {
  const { data } = useNotifications()
  const { mutate: markRead } = useMarkNotificationsRead()
  const items = data?.items ?? []
  const unread = data?.unread ?? 0
  const badge = unread > 9 ? "9+" : String(unread)

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        className={`${buttonVariants({ variant: "secondary", size: "icon-sm" })} relative overflow-visible data-popup-open:bg-ink data-popup-open:text-white`}
      >
        <BellIcon />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-2xs leading-none font-semibold text-primary-foreground"
          >
            {badge}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner align="end" sideOffset={8} className="isolate z-50 outline-none">
          <Popover.Popup className="w-[min(22rem,calc(100vw-2rem))] origin-(--transform-origin) overflow-hidden bg-popover text-popover-foreground shadow-float ring-1 ring-border duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <Popover.Title className="font-heading text-xl font-semibold">Thông báo</Popover.Title>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => markRead(undefined)}
                  className="text-xs font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
                >
                  Đánh dấu đã đọc
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
                  <BellIcon className="size-5" aria-hidden />
                </span>
                <p className="text-sm font-semibold">Chưa có thông báo nào</p>
                <p className="text-xs text-muted-foreground">
                  Khi đơn hàng của bạn có cập nhật, chúng tôi sẽ báo ở đây.
                </p>
              </div>
            ) : (
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {items.map((n) => {
                  const body = (
                    <>
                      <span className="flex items-start gap-2 text-sm font-semibold">
                        {!n.read && <span aria-label="Chưa đọc" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                        <span>{n.title}</span>
                      </span>
                      {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                      <span className="text-xs text-subtle-foreground">{formatRelativeTime(n.createdAt)}</span>
                    </>
                  )
                  const cls = `flex flex-col gap-0.5 px-4 py-3 outline-none focus-visible:bg-secondary ${n.read ? "" : "bg-brand-soft"}`
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link href={n.href} onClick={() => !n.read && markRead([n.id])} className={`${cls} hover:bg-secondary`}>
                          {body}
                        </Link>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <Link
              href="/account/notifications"
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
