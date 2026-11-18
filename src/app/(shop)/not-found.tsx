import Link from "next/link"
import { StatusPage } from "@/components/layout/status-page"
import { buttonVariants } from "@/components/ui/button"

// Hiện trong khung cửa hàng (có header/footer) khi trang gọi notFound(): sản phẩm, danh mục, đơn hàng không tồn tại.
export default function ShopNotFound() {
  return (
    <StatusPage
      eyebrow="Lỗi 404"
      title="Không tìm thấy nội dung bạn cần"
      actions={
        <>
          <Link href="/" className={buttonVariants({ variant: "dark", size: "md", className: "min-w-40" })}>
            Về trang chủ
          </Link>
          <Link
            href="/products"
            className={buttonVariants({ variant: "ink-outline", size: "md", className: "min-w-40" })}
          >
            Xem sản phẩm
          </Link>
        </>
      }
    >
      Đường dẫn có thể đã thay đổi hoặc sản phẩm không còn được bán. Bạn thử quay lại trang chủ hoặc xem toàn bộ sản phẩm.
    </StatusPage>
  )
}
