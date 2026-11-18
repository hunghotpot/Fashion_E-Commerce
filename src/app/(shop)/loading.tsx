import { Skeleton } from "@/components/ui/skeleton"

// Khung chờ chung cho các trang cửa hàng chưa có skeleton riêng (giỏ hàng, thanh toán, tài khoản...).
export default function ShopLoading() {
  return (
    <div className="space-y-6 pb-16" aria-busy aria-live="polite">
      <span className="sr-only">Đang tải…</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
