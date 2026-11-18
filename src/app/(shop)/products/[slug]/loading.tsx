import { Skeleton } from "@/components/ui/skeleton"

// Khung chờ đúng hình trang chi tiết: đường dẫn, ảnh lớn bên trái, tên/giá/màu/size/nút mua bên phải.
export default function ProductDetailLoading() {
  return (
    <div className="space-y-12 pb-16" aria-busy>
      <span className="sr-only" role="status">
        Đang tải sản phẩm…
      </span>
      <Skeleton className="h-4 w-56 max-w-full" aria-hidden />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12" aria-hidden>
        <Skeleton className="aspect-[4/4.6] w-full" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-7 w-1/3" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="size-10 rounded-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-14" />
            ))}
          </div>
          <Skeleton className="h-14 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}
