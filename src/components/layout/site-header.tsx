import { AccountMenu, type AccountMenuUser } from "@/components/layout/account-menu"
import { CartButton } from "@/components/cart/cart-button"
import Link from "next/link"
import { Logo } from "@/components/layout/logo"
import { MobileMenu } from "@/components/layout/mobile-menu"
import { NotificationButton } from "@/components/layout/notification-button"
import { SearchForm } from "@/components/layout/search-form"
import { SiteNav } from "@/components/layout/site-nav"

interface SiteHeaderProps {
  /** null = chưa đăng nhập. */
  user?: AccountMenuUser | null
}

// Menu chính (Hàng mới về, Bộ sưu tập, Nổi bật, Giới thiệu) hiện giữa header từ màn xl; nhỏ hơn dùng nút ba gạch + ngăn kéo.
// Danh mục sản phẩm vẫn duyệt qua lưới danh mục ở trang chủ, chân trang, ô tìm kiếm và trang sản phẩm.
export function SiteHeader({ user = null }: SiteHeaderProps) {
  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-page items-center gap-3 px-4 md:h-[77px] md:gap-4 md:px-8">
        <MobileMenu authenticated={!!user} />
        <Logo />
        <SiteNav />

        <div className="ml-auto flex items-center gap-2 sm:gap-3 xl:ml-0">
          <SearchForm className="hidden w-56 md:block xl:w-60" />
          {user ? (
            <>
              <div className="hidden sm:block">
                <NotificationButton />
              </div>
              <AccountMenu user={user} />
              <CartButton />
            </>
          ) : (
            // Chưa đăng nhập: không có giỏ, thông báo hay tài khoản, chỉ một liên kết Đăng nhập (đăng ký đi từ trang đăng nhập).
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center px-2 text-label font-semibold underline underline-offset-4 outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/40"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

    </header>

    {/* Mobile: ô tìm kiếm nằm hàng riêng dưới header và cuộn đi, chỉ thanh logo + biểu tượng còn dính đầu trang. */}
    <div className="border-b border-border bg-background px-4 pb-3 md:hidden">
      <SearchForm />
    </div>
    </>
  )
}
