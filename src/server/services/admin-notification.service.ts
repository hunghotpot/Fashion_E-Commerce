import "server-only"
import type { Prisma } from "@prisma/client"
import {
  ADMIN_NOTIFICATION_LIMIT,
  ADMIN_NOTIFICATION_RETENTION_DAYS,
  type AdminNotificationCategoryValue,
  type AdminNotificationList,
  type AdminNotificationView,
} from "@/lib/admin-notification"
import { db } from "@/server/db"
import { getShopSettings } from "./shop-settings.service"

/*
 * Hộp thư sự kiện của Admin. Một luồng chung; trạng thái đọc theo từng Admin = mốc `User.adminNotificationsSeenAt`
 * (thông báo mới hơn mốc là chưa đọc) cộng bảng `AdminNotificationRead` (đã đọc riêng từng dòng).
 * Service không tự kiểm quyền: Server Action/trang Admin gọi getAdminUser()/requireAdmin() trước.
 */

export interface AdminNotificationInput {
  category: AdminNotificationCategoryValue
  title: string
  body?: string | null
  href?: string | null
}

/** Ghi một sự kiện cho Admin. Gọi TRONG transaction của sự kiện để thông báo chỉ có khi sự kiện thật sự xảy ra. */
export async function notifyAdmins(tx: Prisma.TransactionClient, input: AdminNotificationInput): Promise<void> {
  await tx.adminNotification.create({
    data: { category: input.category, title: input.title, body: input.body ?? null, href: input.href ?? null },
  })
}

/**
 * Báo "sắp hết hàng"/"hết hàng" khi tồn của một biến thể vừa tụt xuống ngưỡng (trước đó còn trên ngưỡng), đúng một lần.
 * Dùng cho mọi đường làm giảm tồn: khách đặt hàng, Admin kiểm kê/đặt lại tồn, sửa tay trong form sản phẩm.
 */
export async function notifyLowStock(
  tx: Prisma.TransactionClient,
  v: { productName: string; size: string; color: string; before: number; after: number }
): Promise<void> {
  const { lowStockThreshold } = await getShopSettings(tx)
  if (v.after > lowStockThreshold || v.before <= lowStockThreshold) return
  await notifyAdmins(tx, {
    category: "STOCK",
    title: v.after === 0 ? `Hết hàng: ${v.productName}` : `Sắp hết hàng: ${v.productName}`,
    body: `Size ${v.size} · ${v.color} · còn ${v.after} sản phẩm`,
    href: "/admin/products",
  })
}

const select = { id: true, category: true, title: true, body: true, href: true, createdAt: true } as const

type Row = { id: string; category: AdminNotificationCategoryValue; title: string; body: string | null; href: string | null; createdAt: Date }

const toView = (r: Row, seenAt: Date | null, readIds: Set<string>): AdminNotificationView => ({
  id: r.id,
  category: r.category,
  title: r.title,
  body: r.body,
  href: r.href,
  read: (seenAt !== null && r.createdAt <= seenAt) || readIds.has(r.id),
  createdAt: r.createdAt.toISOString(),
})

async function seenAtOf(userId: string): Promise<Date | null> {
  return (await db.user.findUnique({ where: { id: userId }, select: { adminNotificationsSeenAt: true } }))?.adminNotificationsSeenAt ?? null
}

/** Trong các thông báo đã cho, những cái Admin này đã đánh dấu đọc riêng. */
async function readIdsOf(userId: string, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const rows = await db.adminNotificationRead.findMany({ where: { userId, notificationId: { in: ids } }, select: { notificationId: true } })
  return new Set(rows.map((r) => r.notificationId))
}

const unreadWhere = (userId: string, seenAt: Date | null): Prisma.AdminNotificationWhereInput => ({
  ...(seenAt ? { createdAt: { gt: seenAt } } : {}),
  reads: { none: { userId } },
})

/** Chuông: các thông báo mới nhất (mọi loại, lọc phía client) + tổng số chưa đọc. */
export async function listAdminNotifications(userId: string): Promise<AdminNotificationList> {
  const seenAt = await seenAtOf(userId)
  const [rows, unread] = await Promise.all([
    db.adminNotification.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: ADMIN_NOTIFICATION_LIMIT, select }),
    db.adminNotification.count({ where: unreadWhere(userId, seenAt) }),
  ])
  const readIds = await readIdsOf(userId, rows.map((r) => r.id))
  return { items: rows.map((r) => toView(r, seenAt, readIds)), unread }
}

export const ADMIN_NOTIFICATION_PAGE_SIZE = 15

/** Trang đầy đủ, lọc theo loại. `page` bắt đầu từ 1; ngoài phạm vi thì về trang cuối. */
export async function listAdminNotificationsPage(userId: string, opts: { category?: AdminNotificationCategoryValue; page?: number } = {}) {
  const seenAt = await seenAtOf(userId)
  const where: Prisma.AdminNotificationWhereInput = opts.category ? { category: opts.category } : {}
  const total = await db.adminNotification.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_NOTIFICATION_PAGE_SIZE))
  const current = Math.min(Math.max(1, Math.trunc(opts.page ?? 1) || 1), pageCount)
  const rows = await db.adminNotification.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * ADMIN_NOTIFICATION_PAGE_SIZE,
    take: ADMIN_NOTIFICATION_PAGE_SIZE,
    select,
  })
  const readIds = await readIdsOf(userId, rows.map((r) => r.id))
  return { items: rows.map((r) => toView(r, seenAt, readIds)), total, page: current, pageCount }
}

/** "Đánh dấu đã đọc": đặt mốc đã đọc của Admin này bằng thời điểm hiện tại (không ảnh hưởng Admin khác). */
export async function markAdminNotificationsSeen(userId: string, now: Date = new Date()): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { adminNotificationsSeenAt: now } })
}

/** Đánh dấu MỘT thông báo là đã đọc cho Admin này. Thông báo đã bị dọn/không tồn tại thì bỏ qua; gọi lại không lỗi. */
export async function markAdminNotificationRead(userId: string, notificationId: string): Promise<void> {
  if (!(await db.adminNotification.findUnique({ where: { id: notificationId }, select: { id: true } }))) return
  await db.adminNotificationRead.createMany({ data: [{ notificationId, userId }], skipDuplicates: true })
}

/** Xoá thông báo cũ hơn ADMIN_NOTIFICATION_RETENTION_DAYS (cron). Trả về số dòng đã xoá. */
export async function deleteOldAdminNotifications(now: Date = new Date()): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - ADMIN_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  const { count } = await db.adminNotification.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return { deleted: count }
}
