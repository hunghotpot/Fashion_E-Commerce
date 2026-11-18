import { Skeleton } from "@/components/ui/skeleton"

// Khung chờ cho mọi trang Admin: header, tiêu đề và sidebar của layout đứng yên, chỉ vùng nội dung hiện khung chờ.
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy>
      <span className="sr-only" role="status">
        Đang tải…
      </span>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="space-y-3" aria-hidden>
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
