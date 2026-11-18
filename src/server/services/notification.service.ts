import "server-only"
import type { Prisma } from "@prisma/client"
import { NOTIFICATION_LIMIT, orderStatusMessage, paymentConfirmedMessage } from "@/lib/notification"
import { markNotificationsReadSchema } from "@/lib/validators/notification"
import { db } from "@/server/db"
import type { NotificationList } from "@/types/notification"
import type { OrderStatusValue } from "@/types/order"

/*
 * Thông báo cho khách. Hiện chỉ có loại ORDER_STATUS, tạo ngay trong transaction đổi trạng thái đơn (recordStatusChange).
 * Mọi hàm đọc/ghi đều ràng buộc `userId` trong câu truy vấn: khách chỉ thấy và sửa được thông báo của chính mình.
 */

/** Tạo thông báo đổi trạng thái cho chủ đơn. Gọi TRONG transaction đổi trạng thái. Trạng thái không cần báo thì bỏ qua. */
export async function notifyOrderStatus(tx: Prisma.TransactionClient, orderId: string, to: OrderStatusValue): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { userId: true, code: true, total: true, items: { select: { quantity: true } } },
  })
  if (!order) return
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
  const message = orderStatusMessage(order.code, to, { total: order.total, itemCount })
  if (!message) return
  await tx.notification.create({
    data: { userId: order.userId, type: "ORDER_STATUS", title: message.title, body: message.body, href: `/account/orders/${orderId}` },
  })
}

/** Báo cho chủ đơn là cửa hàng đã xác nhận nhận tiền chuyển khoản. Gọi TRONG transaction xác nhận thanh toán. */
export async function notifyPaymentConfirmed(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { userId: true, code: true, total: true, items: { select: { quantity: true } } },
  })
  if (!order) return
  const message = paymentConfirmedMessage(order.code, { total: order.total, itemCount: order.items.reduce((n, i) => n + i.quantity, 0) })
  await tx.notification.create({
    data: { userId: order.userId, type: "ORDER_STATUS", title: message.title, body: message.body, href: `/account/orders/${orderId}` },
  })
}

const toView =(r: { id: string; title: string; body: string | null; href: string | null; readAt: Date | null; createdAt: Date }) => ({
  id: r.id,
  title: r.title,
  body: r.body,
  href: r.href,
  read: r.readAt !== null,
  createdAt: r.createdAt.toISOString(),
})

const viewSelect = { id: true, title: true, body: true, href: true, readAt: true, createdAt: true } as const

export const NOTIFICATION_PAGE_SIZE = 10

/** Trang đầy đủ của thông báo (trang /account/notifications). `page` bắt đầu từ 1; ngoài phạm vi thì về trang cuối. */
export async function listNotificationsPage(userId: string, page = 1) {
  const total = await db.notification.count({ where: { userId } })
  const pageCount = Math.max(1, Math.ceil(total / NOTIFICATION_PAGE_SIZE))
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount)
  const rows = await db.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * NOTIFICATION_PAGE_SIZE,
    take: NOTIFICATION_PAGE_SIZE,
    select: viewSelect,
  })
  return { items: rows.map(toView), total, page: current, pageCount }
}

export async function listNotifications(userId: string): Promise<NotificationList> {
  const [rows, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: NOTIFICATION_LIMIT,
      select: viewSelect,
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ])
  return { items: rows.map(toView), unread }
}

/** Đánh dấu đã đọc: `ids` rỗng/không có = tất cả của người dùng. Trả về số thông báo vừa được đánh dấu. */
export async function markNotificationsRead(userId: string, input?: unknown): Promise<number> {
  const { ids } = markNotificationsReadSchema.parse(input ?? {})
  const res = await db.notification.updateMany({
    where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  })
  return res.count
}
