"use client"

import { cn } from "@/lib/cn"
import { useFilterPending } from "@/stores/product-filter-pending"

// Làm mờ nhẹ lưới cũ + thanh tiến độ mảnh trong lúc đổi bộ lọc (Next giữ UI cũ tới khi RSC mới về); vị trí cuộn được giữ.
export function ResultsFrame({ children }: { children: React.ReactNode }) {
  const pending = useFilterPending((s) => s.pending)
  return (
    <div aria-busy={pending}>
      <div aria-hidden className={cn("mb-3 h-0.5 overflow-hidden bg-border transition-opacity", pending ? "opacity-100" : "opacity-0")}>
        <span className={cn("block h-full w-2/5 bg-brand", pending && "animate-[progress-slide_1s_ease-in-out_infinite]")} />
      </div>
      <div className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-70")}>{children}</div>
    </div>
  )
}
