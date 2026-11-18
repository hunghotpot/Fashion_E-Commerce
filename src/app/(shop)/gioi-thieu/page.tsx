import type { Metadata } from "next"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { getStoreProfile } from "@/server/services/store-profile.service"

export const metadata: Metadata = { title: "Giới thiệu" }

// Nội dung do Admin nhập ở Cài đặt > Cửa hàng & Brand (StoreProfile.about); các đoạn cách nhau bằng dòng trống.
export default async function AboutPage() {
  const { about } = await getStoreProfile()
  const paragraphs = about ? about.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : []

  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-4">
      <header className="space-y-3">
        <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          <span aria-hidden className="h-px w-7 bg-brand" />
          Về chúng tôi
        </p>
        <h1 className="text-4xl font-semibold text-balance md:text-5xl">Câu chuyện thương hiệu</h1>
      </header>
      {paragraphs.length > 0 ? (
        <div className="max-w-2xl space-y-4 text-muted-foreground">
          {paragraphs.map((p, i) => (
            <p key={i} className="leading-relaxed whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      ) : (
        <p className="bg-secondary p-4 text-label text-muted-foreground">
          Phần giới thiệu đang được cửa hàng cập nhật. Vui lòng quay lại sau.
        </p>
      )}
      <Link href="/products" className={buttonVariants({ variant: "dark", size: "md", className: "min-w-40" })}>
        Xem sản phẩm
      </Link>
    </article>
  )
}
