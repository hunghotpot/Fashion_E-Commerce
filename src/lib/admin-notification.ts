/*
 * Hộp thư sự kiện của Admin: hằng số và nhãn dùng chung server/client.
 */

export const ADMIN_NOTIFICATION_CATEGORIES = ["ORDER", "PAYMENT", "STOCK"] as const
export type AdminNotificationCategoryValue = (typeof ADMIN_NOTIFICATION_CATEGORIES)[number]

export const ADMIN_NOTIFICATION_CATEGORY_LABEL: Record<AdminNotificationCategoryValue, string> = {
  ORDER: "Đơn hàng",
  PAYMENT: "Thanh toán",
  STOCK: "Kho",
}

/** Số thông báo mới nhất trả về cho chuông Admin. */
export const ADMIN_NOTIFICATION_LIMIT = 20

/** Thông báo cũ hơn số ngày này bị cron dọn đi (kèm trạng thái đã đọc của nó). */
export const ADMIN_NOTIFICATION_RETENTION_DAYS = 30

export interface AdminNotificationView {
  id: string
  category: AdminNotificationCategoryValue
  title: string
  body: string | null
  href: string | null
  read: boolean
  createdAt: string
}

export interface AdminNotificationList {
  items: AdminNotificationView[]
  unread: number
}

/** Giá trị ?category= sai hoặc rỗng thì coi như "Tất cả" (undefined). */
export function parseAdminNotificationCategory(raw: unknown): AdminNotificationCategoryValue | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw
  return ADMIN_NOTIFICATION_CATEGORIES.find((c) => c === v)
}
