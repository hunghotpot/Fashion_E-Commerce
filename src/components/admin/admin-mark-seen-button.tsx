"use client"

import { markAdminNotificationsSeenAction } from "@/app/actions/admin-notifications"
import { useAdminAction } from "@/components/admin/use-admin-action"
import { Button } from "@/components/ui/button"

/** Nút "Đánh dấu đã đọc" ở trang thông báo Admin (cùng Server Action với chuông). */
export function AdminMarkSeenButton() {
  const { pending, run } = useAdminAction()
  return (
    <Button type="button" variant="ink-outline" size="md" disabled={pending} onClick={() => run(() => markAdminNotificationsSeenAction())}>
      Đánh dấu đã đọc
    </Button>
  )
}
