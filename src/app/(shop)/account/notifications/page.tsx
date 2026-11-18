import type { Metadata } from "next"
import Link from "next/link"
import { MarkAllReadButton } from "@/components/account/mark-all-read-button"
import { buttonVariants } from "@/components/ui/button"
import { formatRelativeTime } from "@/lib/notification"
import { requireUser } from "@/server/auth/session"
import { listNotificationsPage } from "@/server/services/notification.service"

export const metadata: Metadata = { title: "Thông báo", robots: { index: false } }

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const user = await requireUser("/account/notifications")
  const raw = (await searchParams).page
  const result = await listNotificationsPage(user.id, Number(Array.isArray(raw) ? raw[0] : raw))
  const hasUnread = result.items.some((n) => !n.read)

  return (
    <div className="space-y-6 pb-16">
      <div>
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <Link href="/" className="inline-block py-2 hover:text-foreground">
            Trang chủ
          </Link>
          {" / "}
          <Link href="/account/profile" className="inline-block py-2 hover:text-foreground">
            Tài khoản
          </Link>
          {" / "}
          <span className="font-semibold text-foreground">Thông báo</span>
        </nav>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold">Thông Báo</h1>
          {hasUnread && <MarkAllReadButton />}
        </div>
      </div>

      {result.items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 border border-dashed border-border-strong px-6 py-16 text-center">
          <p className="font-heading text-2xl font-semibold">Chưa có thông báo nào</p>
          <p className="max-w-sm text-label text-muted-foreground">Khi đơn hàng của bạn có cập nhật, chúng tôi sẽ báo ở đây.</p>
          <Link href="/products" className={buttonVariants({ variant: "dark", size: "md" })}>
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border border border-border bg-card">
          {result.items.map((n) => {
            const content = (
              <>
                <span className="flex items-start gap-2 text-label font-semibold">
                  {!n.read && <span aria-label="Chưa đọc" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                  <span>{n.title}</span>
                </span>
                {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-xs text-subtle-foreground">{formatRelativeTime(n.createdAt)}</span>
              </>
            )
            const cls = `flex flex-col gap-1 px-5 py-4 outline-none focus-visible:bg-secondary ${n.read ? "" : "bg-brand-soft"}`
            return (
              <li key={n.id}>
                {n.href ? (
                  <Link href={n.href} className={`${cls} hover:bg-secondary`}>
                    {content}
                  </Link>
                ) : (
                  <div className={cls}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {result.pageCount > 1 && (
        <nav aria-label="Phân trang" className="flex items-center justify-between gap-4 pt-2 text-label">
          <p className="text-muted-foreground">
            Trang {result.page} / {result.pageCount} · {result.total} thông báo
          </p>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/account/notifications?page=${result.page - 1}`}
                className={buttonVariants({ variant: "ink-outline", size: "sm", className: "min-w-24" })}
              >
                Trang trước
              </Link>
            )}
            {result.page < result.pageCount && (
              <Link
                href={`/account/notifications?page=${result.page + 1}`}
                className={buttonVariants({ variant: "ink-outline", size: "sm", className: "min-w-24" })}
              >
                Trang sau
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
