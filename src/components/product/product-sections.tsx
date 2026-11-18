import Link from "next/link"
import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductCard } from "@/components/product/product-card"
import { getFeaturedProducts, getNewProducts } from "@/server/services/catalog.service"

const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4"

export function SectionHeading({
  id,
  title,
  href,
  linkLabel = "Xem tất cả →",
  eyebrow,
}: {
  id: string
  title: ReactNode
  href?: string
  /** Chữ của liên kết nhỏ gạch chân bên phải tiêu đề (mặc định "Xem tất cả →"). */
  linkLabel?: string
  /** Dòng nhỏ viết hoa phía trên tiêu đề. */
  eyebrow?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-2xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{eyebrow}</p>
        )}
        <h2
          id={id}
          tabIndex={-1}
          className="text-2xl font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40 md:text-3xl"
        >
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex min-h-11 shrink-0 items-center text-label font-semibold underline underline-offset-4 hover:text-primary"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

export async function FeaturedProducts() {
  const products = await getFeaturedProducts(8)
  if (products.length === 0) return null
  return (
    <section id="noi-bat" aria-labelledby="featured-heading" className="reveal scroll-mt-24 space-y-6">
      <SectionHeading
        id="featured-heading"
        title="Sản phẩm nổi bật"
        eyebrow="Tuyển chọn"
        href="/products?featured=1"
      />
      <div className={GRID}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  )
}

export async function NewProducts() {
  const products = await getNewProducts(8)
  if (products.length === 0) return null
  return (
    <section id="san-pham-moi" aria-labelledby="new-heading" className="reveal scroll-mt-24 space-y-6">
      <SectionHeading id="new-heading" title="Sản phẩm mới" href="/hang-moi-ve" />
      <div className={GRID}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} isNew />
        ))}
      </div>
    </section>
  )
}

export function ProductSectionSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-6 w-56" />
      <div className={GRID}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-4/5 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
