import type { Metadata } from "next"
import Link from "next/link"
import { ProductCard } from "@/components/product/product-card"
import { getNewProducts } from "@/server/services/catalog.service"

export const metadata: Metadata = {
  title: "Hàng mới về",
  description: "24 sản phẩm mới nhất vừa lên kệ.",
  alternates: { canonical: "/hang-moi-ve" },
}

const NEW_ARRIVALS_COUNT = 24

// Trang riêng của mục "Sản phẩm mới" ở trang chủ: đúng 24 sản phẩm mới nhất, không phân trang, không bộ lọc.
export default async function NewArrivalsPage() {
  const products = await getNewProducts(NEW_ARRIVALS_COUNT)

  return (
    <div className="space-y-6 pb-16">
      <div>
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
          <Link href="/" className="inline-block py-2 hover:text-foreground">
            Trang chủ
          </Link>
          {" / "}
          <span className="text-foreground">Hàng mới về</span>
        </nav>
        <h1 className="text-4xl font-semibold">Hàng mới về</h1>
        <p className="mt-2 max-w-xl text-label text-muted-foreground">
          {products.length > 0 ? `${products.length} sản phẩm mới nhất vừa lên kệ.` : "Chưa có sản phẩm nào."}
        </p>
      </div>

      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} isNew priority={i < 3} />
          ))}
        </div>
      )}

      <p className="pt-4 text-center">
        <Link href="/products" className="inline-flex min-h-11 items-center text-label font-semibold underline underline-offset-4 hover:text-primary">
          Xem tất cả sản phẩm →
        </Link>
      </p>
    </div>
  )
}
