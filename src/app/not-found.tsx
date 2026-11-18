import Link from "next/link"
import { Logo } from "@/components/layout/logo"
import { StatusPage } from "@/components/layout/status-page"
import { buttonVariants } from "@/components/ui/button"

// Đường dẫn không khớp trang nào: nằm ngoài khung cửa hàng nên tự có logo.
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-page px-4 py-8 md:px-8">
      <Logo />
      <StatusPage
        eyebrow="Lỗi 404"
        title="Không tìm thấy trang này"
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
        Đường dẫn bạn mở không tồn tại. Bạn thử quay lại trang chủ hoặc xem toàn bộ sản phẩm.
      </StatusPage>
    </div>
  )
}
