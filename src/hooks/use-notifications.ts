"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { NotificationList } from "@/types/notification"

export const NOTIFICATIONS_KEY = ["notifications"] as const

async function fetchNotifications(): Promise<NotificationList> {
  const res = await fetch("/api/notifications", { cache: "no-store" })
  if (!res.ok) throw new Error("Không tải được thông báo")
  return (await res.json()) as NotificationList
}

/** Thông báo của người dùng: tải lại mỗi phút và khi quay lại tab. Chỉ dùng khi đã đăng nhập (nút chuông chỉ hiện khi đó). */
export function useNotifications() {
  return useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, refetchInterval: 60_000 })
}

/** Đánh dấu đã đọc: `ids` có giá trị = chỉ các thông báo đó, bỏ trống = tất cả. */
export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      })
      if (!res.ok) throw new Error("Không đánh dấu được thông báo")
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}
