/** Thông báo trả về cho client (không lộ userId). `createdAt` là chuỗi ISO. */
export interface NotificationView {
  id: string
  title: string
  body: string | null
  href: string | null
  read: boolean
  createdAt: string
}

export interface NotificationList {
  items: NotificationView[]
  unread: number
}
