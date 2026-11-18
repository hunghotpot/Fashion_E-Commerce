import type { Metadata } from "next"
import Link from "next/link"
import { AdminMarkSeenButton } from "@/components/admin/admin-mark-seen-button"
import { AdminNotificationRow } from "@/components/admin/admin-notification-row"
import { AdminPagination } from "@/components/admin/list/admin-pagination"
import { AdminEmpty, ListCard, ListSection } from "@/components/admin/list/admin-table"
import type { RawSearchParams } from "@/lib/admin-list"
import { ADMIN_NOTIFICATION_CATEGORIES, ADMIN_NOTIFICATION_CATEGORY_LABEL, parseAdminNotificationCategory } from "@/lib/admin-notification"
import { cn } from "@/lib/cn"
import { requireAdmin } from "@/server/auth/session"
import { ADMIN_NOTIFICATION_PAGE_SIZE, listAdminNotificationsPage } from "@/server/services/admin-notification.service"

export const metadata: Metadata = { title: "Thông báo" }

const pill = (active: boolean) =>
  cn(
    "inline-flex h-11 items-center border px-4 text-label font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
    active ? "border-ink bg-ink text-white" : "border-border bg-card text-sidebar-foreground hover:bg-secondary"
  )

export default async function AdminNotificationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const admin = await requireAdmin("/admin/notifications")
  const sp = await searchParams
  const category = parseAdminNotificationCategory(sp.category)
  const pageRaw = Array.isArray(sp.page) ? sp.page[0] : sp.page
  const result = await listAdminNotificationsPage(admin.id, { category, page: Number(pageRaw) })
  const hasUnread = result.items.some((n) => !n.read)

  return (
    <ListSection title="Hộp thư sự kiện">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo loại">
          <Link href="/admin/notifications" aria-current={!category ? "page" : undefined} className={pill(!category)}>
            Tất cả
          </Link>
          {ADMIN_NOTIFICATION_CATEGORIES.map((c) => (
            <Link key={c} href={`/admin/notifications?category=${c}`} aria-current={category === c ? "page" : undefined} className={pill(category === c)}>
              {ADMIN_NOTIFICATION_CATEGORY_LABEL[c]}
            </Link>
          ))}
        </div>
        {hasUnread && (
          <div className="sm:ml-auto">
            <AdminMarkSeenButton />
          </div>
        )}
      </div>

      <ListCard>
        {result.items.length === 0 ? (
          <AdminEmpty title="Chưa có thông báo nào." hint="Đơn mới, chuyển khoản chờ xác nhận và hàng sắp hết sẽ báo ở đây." />
        ) : (
          <ul className="divide-y divide-border">
            {result.items.map((n) => (
              <AdminNotificationRow key={n.id} n={n} variant="page" />
            ))}
          </ul>
        )}
        <AdminPagination
          page={result.page}
          pageSize={ADMIN_NOTIFICATION_PAGE_SIZE}
          total={result.total}
          noun="thông báo"
          basePath="/admin/notifications"
          searchParams={sp}
        />
      </ListCard>
    </ListSection>
  )
}
