"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClockIcon } from "lucide-react"
import { cn } from "@/lib/cn"

const pad = (n: number) => String(n).padStart(2, "0")

/** "23 giờ 41 phút 05 giây" cho thời gian còn lại (làm tròn xuống giây). */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h} giờ ${pad(m)} phút ${pad(s)} giây` : `${m} phút ${pad(s)} giây`
}

/**
 * Đếm ngược tới hạn thanh toán. Chỉ tính thời gian sau khi trang đã chạy trên trình duyệt (tránh lệch HTML server/client).
 * Hết hạn thì làm mới trang một lần để server huỷ/chuyển trạng thái đơn. Không phát âm mỗi giây cho trình đọc màn hình
 * (role="timer" mặc định không thông báo); mốc hạn cố định được in ra bằng chữ ở ngay cạnh.
 */
export function PaymentCountdown({ deadline, className }: { deadline: string; className?: string }) {
  const router = useRouter()
  const end = new Date(deadline).getTime()
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setRemaining(end - Date.now())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [end])

  const expired = remaining !== null && remaining <= 0
  useEffect(() => {
    if (expired) router.refresh()
  }, [expired, router])

  const urgent = remaining !== null && remaining > 0 && remaining < 60 * 60 * 1000
  return (
    <p className={cn("inline-flex items-center gap-2 text-label font-semibold tabular-nums", expired ? "text-destructive" : urgent ? "text-warning" : "text-foreground", className)}>
      <ClockIcon className="size-4 shrink-0" aria-hidden />
      <span role="timer">{remaining === null ? "Đang tính thời gian..." : expired ? "Đã hết hạn thanh toán" : `Còn ${formatRemaining(remaining)}`}</span>
    </p>
  )
}
