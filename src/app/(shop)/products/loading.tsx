import { GridSkeleton, SidebarSkeleton } from "@/components/product/product-listing"
import { Skeleton } from "@/components/ui/skeleton"

// Khung chờ đúng hình trang danh sách: tiêu đề, cột bộ lọc (màn lớn), hàng công cụ và lưới thẻ sản phẩm.
export default function ProductsLoading() {
  return (
    <div aria-busy>
      <span className="sr-only" role="status">
        Đang tải sản phẩm…
      </span>
      <Skeleton className="mb-6 h-10 w-72 max-w-full" />
      <div className="grid gap-8 pb-16 lg:grid-cols-[260px_1fr]">
        <aside className="hidden pr-2 lg:block">
          <SidebarSkeleton />
        </aside>
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3" aria-hidden>
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-44" />
          </div>
          <GridSkeleton />
        </div>
      </div>
    </div>
  )
}
