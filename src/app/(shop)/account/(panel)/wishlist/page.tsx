import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { ProductCard } from "@/components/product/product-card"
import { buttonVariants } from "@/components/ui/button"
import { WishlistRemoveButton } from "@/components/wishlist/wishlist-remove-button"
import { cn } from "@/lib/cn"
import { requireUser } from "@/server/auth/session"
import { listWishlist } from "@/server/services/wishlist.service"

export const metadata: Metadata = { title: "Sản phẩm yêu thích" }

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const user = await requireUser("/account/wishlist")
  const sp = await searchParams
  const list = await listWishlist(user.id, { page: Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1 })
  const href = (p: number) => (p > 1 ? `/account/wishlist?page=${p}` : "/account/wishlist")

  return (
    <section aria-labelledby="my-wishlist" className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="my-wishlist" className="text-2xl font-semibold">
          Sản phẩm yêu thích
        </h2>
        {list.total > 0 && <p className="text-label text-muted-foreground">{list.total} sản phẩm</p>}
      </div>

      {list.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <p className="text-label font-semibold">{list.total > 0 ? "Không còn sản phẩm ở trang này" : "Bạn chưa lưu sản phẩm nào"}</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {list.total > 0 ? "Quay lại trang đầu để xem các sản phẩm đã lưu." : "Bấm trái tim ở trang chi tiết sản phẩm để lưu lại xem sau."}
          </p>
          <Link href={list.total > 0 ? "/account/wishlist" : "/products"} className={buttonVariants({ variant: "ink-outline", size: "md", className: "mt-3" })}>
            {list.total > 0 ? "Về trang đầu" : "Xem sản phẩm"}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-4">
          {list.items.map((p) => (
            <li key={p.id} className="flex flex-col gap-1">
              <ProductCard product={p} />
              <WishlistRemoveButton productId={p.id} productName={p.name} />
            </li>
          ))}
        </ul>
      )}

      {list.totalPages > 1 && (
        <nav aria-label="Phân trang yêu thích" className="mt-8 flex items-center justify-center gap-1.5">
          {list.page > 1 && (
            <Link href={href(list.page - 1)} aria-label="Trang trước" className="grid size-10 place-items-center hover:bg-secondary pointer-coarse:size-11">
              <ChevronLeftIcon className="size-4" />
            </Link>
          )}
          {Array.from({ length: list.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={href(p)}
              aria-current={p === list.page ? "page" : undefined}
              className={cn("grid size-10 place-items-center text-sm font-semibold pointer-coarse:size-11", p === list.page ? "bg-ink text-white" : "hover:bg-secondary")}
            >
              {p}
            </Link>
          ))}
          {list.page < list.totalPages && (
            <Link href={href(list.page + 1)} aria-label="Trang sau" className="grid size-10 place-items-center hover:bg-secondary pointer-coarse:size-11">
              <ChevronRightIcon className="size-4" />
            </Link>
          )}
        </nav>
      )}
    </section>
  )
}
