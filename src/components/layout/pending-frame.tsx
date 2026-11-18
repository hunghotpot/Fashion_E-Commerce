"use client"

import { cn } from "@/lib/cn"
import { useFilterPending } from "@/stores/product-filter-pending"

/**
 * Khung báo "đang chuyển": khi một nút lọc/điều hướng đang chờ server trả dữ liệu mới (cờ `useFilterPending`), nội dung cũ mờ nhẹ,
 * không bấm được và có thanh tiến độ mảnh ở mép trên. Thanh nằm đè (absolute) nên không làm xê dịch bố cục.
 * Next giữ UI cũ tới khi dữ liệu mới về, nên không có khung này thì người dùng không biết nút đã nhận lệnh và bấm lại nhiều lần.
 */
export function PendingFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  const pending = useFilterPending((s) => s.pending)
  return (
    <div aria-busy={pending} className={cn("relative", className)}>
      <div
        aria-hidden
        className={cn("pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-border transition-opacity", pending ? "opacity-100" : "opacity-0")}
      >
        <span className={cn("block h-full w-2/5 bg-brand", pending && "animate-[progress-slide_1s_ease-in-out_infinite]")} />
      </div>
      <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-70")}>{children}</div>
    </div>
  )
}
