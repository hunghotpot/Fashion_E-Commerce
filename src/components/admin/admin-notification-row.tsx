"use client"

import Link from "next/link"
import { markAdminNotificationReadAction } from "@/app/actions/admin-notifications"
import { useAdminAction } from "@/components/admin/use-admin-action"
import { ADMIN_NOTIFICATION_CATEGORY_LABEL, type AdminNotificationView } from "@/lib/admin-notification"
import { cn } from "@/lib/cn"
import { formatRelativeTime } from "@/lib/notification"

/**
 * Một dòng thông báo Admin (dùng ở chuông và trang /admin/notifications). Dòng chưa đọc: bấm vào nội dung (có liên kết) thì
 * tự đánh dấu đã đọc rồi chuyển trang; nút "Đã đọc" đánh dấu mà không rời trang (cần cho dòng không có liên kết).
 */
export function AdminNotificationRow({ n, variant }: { n: AdminNotificationView; variant: "bell" | "page" }) {
  const { pending, run } = useAdminAction()
  const page = variant === "page"

  const content = (
    <>
      <span className={cn("flex items-start gap-2 font-semibold", page ? "text-label" : "text-sm")}>
        <span
          aria-label={n.read ? undefined : "Chưa đọc"}
          className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "border border-border-strong" : "bg-brand")}
        />
        <span className="min-w-0">{n.title}</span>
      </span>
      {n.body && <span className="pl-4 text-xs text-muted-foreground">{n.body}</span>}
      <span className="pl-4 text-xs text-subtle-foreground">
        {ADMIN_NOTIFICATION_CATEGORY_LABEL[n.category]} · {formatRelativeTime(n.createdAt)}
      </span>
    </>
  )
  const cls = cn("flex min-w-0 flex-1 flex-col outline-none focus-visible:bg-secondary", page ? "gap-1 px-5 py-4" : "gap-0.5 px-4 py-3")

  return (
    <li className={cn("flex items-start", !n.read && "bg-brand-soft")}>
      {n.href ? (
        <Link
          href={n.href}
          className={`${cls} hover:bg-secondary`}
          onClick={() => {
            if (!n.read) void markAdminNotificationReadAction(n.id)
          }}
        >
          {content}
        </Link>
      ) : (
        <div className={cls}>{content}</div>
      )}
      {!n.read && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markAdminNotificationReadAction(n.id))}
          className={cn(
            "inline-flex h-8 shrink-0 items-center px-3 text-xs font-semibold text-brand-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50 pointer-coarse:h-11",
            page ? "m-3" : "m-2"
          )}
        >
          Đã đọc
        </button>
      )}
    </li>
  )
}
