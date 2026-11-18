"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useMarkNotificationsRead } from "@/hooks/use-notifications"

// Đánh dấu mọi thông báo đã đọc rồi làm mới trang (danh sách do server dựng).
export function MarkAllReadButton() {
  const router = useRouter()
  const { mutate, isPending } = useMarkNotificationsRead()
  return (
    <Button
      type="button"
      variant="dark"
      size="md"
      disabled={isPending}
      onClick={() => mutate(undefined, { onSuccess: () => router.refresh() })}
    >
      Đánh dấu tất cả đã đọc
    </Button>
  )
}
