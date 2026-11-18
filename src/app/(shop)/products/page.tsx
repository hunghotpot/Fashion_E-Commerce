import type { Metadata } from "next"
import Link from "next/link"
import { ProductListing } from "@/components/product/product-listing"
import { listingTitle } from "@/lib/listing-title"
import { parseProductFilters } from "@/lib/validators/product-filter"

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filters = parseProductFilters(await searchParams)
  return { title: filters.q ? `Tìm kiếm: ${filters.q}` : listingTitle(filters) }
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams
  const title = listingTitle(parseProductFilters(sp))

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground">
        <Link href="/" className="inline-block py-2 hover:text-foreground">
          Trang chủ
        </Link>
        {" / "}
        <span className="text-foreground">{title}</span>
      </nav>
      <h1 className="mb-6 text-4xl font-semibold">{title}</h1>
      <ProductListing searchParams={sp} basePath="/products" />
    </>
  )
}
