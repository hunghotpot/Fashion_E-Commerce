import type { Metadata } from "next"
import { Suspense } from "react"
import { Hero } from "@/components/home/hero"
import { Lookbook } from "@/components/home/lookbook"
import { CategoryGrid, CategoryGridSkeleton } from "@/components/product/category-grid"
import {
  FeaturedProducts,
  NewProducts,
  ProductSectionSkeleton,
} from "@/components/product/product-sections"
import { defaultFreeShippingThreshold } from "@/lib/shop-settings"
import { SITE_NAME } from "@/lib/site"
import { getShopSettings } from "@/server/services/shop-settings.service"

const description =
  "Thời trang nam nữ hiện đại: áo thun, áo sơ mi, áo khoác, quần jeans, váy đầm và phụ kiện. Giao hàng toàn quốc, thanh toán khi nhận hàng."

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} - Thời trang hiện đại và năng động` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: `${SITE_NAME} - Thời trang hiện đại và năng động`,
    description,
  },
}

export default async function HomePage() {
  const settings = await getShopSettings()
  return (
    <div className="space-y-16 md:space-y-24">
      <Hero freeShippingFrom={defaultFreeShippingThreshold(settings)} />
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid />
      </Suspense>
      <Lookbook />
      <Suspense fallback={<ProductSectionSkeleton />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={<ProductSectionSkeleton />}>
        <NewProducts />
      </Suspense>
    </div>
  )
}
