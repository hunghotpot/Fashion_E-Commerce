import Link from "next/link"
import { Logo } from "@/components/layout/logo"
import { POLICIES } from "@/lib/policies"
import { SITE_NAME } from "@/lib/site"
import type { StoreProfile } from "@/server/services/store-profile.service"
import type { NavCategory } from "@/types/catalog"

const ACCOUNT_LINKS = [
  { href: "/account/profile", label: "Thông tin cá nhân" },
  { href: "/account/orders", label: "Đơn hàng của tôi" },
  { href: "/account/addresses", label: "Sổ địa chỉ" },
]

const SUPPORT_LINKS = [
  { href: "/cau-hoi-thuong-gap", label: "Câu hỏi thường gặp" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/lien-he", label: "Liên hệ" },
]

const linkClass = "text-label text-white/70 transition-colors hover:text-white"
const headingClass = "mb-4 font-sans text-xs font-semibold tracking-[0.16em] uppercase"

// Footer nền ink, chữ trắng (chữ phụ white/70 ≥ 4.5:1). Máy tính: MỘT hàng năm cột (giới thiệu, danh mục, tài khoản, chính sách, hỗ trợ), không cột nào
// xếp chồng lên cột khác nên footer chỉ cao bằng cột dài nhất. Máy tính bảng: giới thiệu một hàng riêng rồi bốn cột. Điện thoại: hai cột.
export function SiteFooter({ categories, profile }: { categories: NavCategory[]; profile?: StoreProfile }) {
  const contacts = [profile?.hotline, profile?.email, profile?.address].filter((v): v is string => !!v)
  return (
    <footer className="mt-16 bg-ink text-white">
      <div className="mx-auto grid w-full max-w-page grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 md:grid-cols-4 md:gap-8 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 space-y-4 md:col-span-4 lg:col-span-1">
          <Logo inverted />
          <p className="max-w-sm text-sm text-white/70">
            Khám phá phong cách thời trang hiện đại và năng động, từ đồ mặc hằng ngày đến phụ kiện.
          </p>
          {contacts.length > 0 && (
            <ul aria-label="Thông tin liên hệ" className="space-y-1 text-label text-white/70">
              {contacts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Danh mục ở chân trang">
          <h2 className={headingClass}>Danh mục</h2>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className={linkClass}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Tài khoản">
          <h2 className={headingClass}>Tài khoản</h2>
          <ul className="space-y-2">
            {ACCOUNT_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Chính sách">
          <h2 className={headingClass}>Chính sách</h2>
          <ul className="space-y-2">
            {POLICIES.map((p) => (
              <li key={p.slug}>
                <Link href={`/chinh-sach/${p.slug}`} className={linkClass}>
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Hỗ trợ">
          <h2 className={headingClass}>Hỗ trợ</h2>
          <ul className="space-y-2">
            {SUPPORT_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-page px-4 pt-5 pb-20 text-xs text-white/70 sm:pb-5 md:px-8">
          © {new Date().getFullYear()} {SITE_NAME}. Bảo lưu mọi quyền.
        </p>
      </div>
    </footer>
  )
}
