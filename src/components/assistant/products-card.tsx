import Image from "next/image"
import Link from "next/link"
import { ImageIcon } from "lucide-react"
import { formatVnd } from "@/lib/format"
import type { ProductCardLite } from "@/lib/validators/ai"

// Thẻ kết quả tìm kiếm trong chat. Dữ liệu (tên, giá, ảnh) do server dựng từ tool searchProducts, không phải chữ của model.
export function ProductsCard({ items }: { items: ProductCardLite[] }) {
  if (items.length === 0) return null
  return (
    <article aria-label="Sản phẩm gợi ý" className="rounded-2xl border border-border bg-card px-4">
      <ul>
        {items.map((item) => (
          <li key={item.slug} className="flex gap-3 border-t border-border py-3 first:border-t-0">
            <Link
              href={`/products/${item.slug}`}
              aria-label={`Xem ${item.name}`}
              className="relative block h-[4.5rem] w-14 shrink-0 overflow-hidden rounded-md bg-secondary"
            >
              {item.image ? (
                <Image src={item.image.url} alt={item.image.alt} fill sizes="44px" className="object-cover" />
              ) : (
                <ImageIcon className="absolute inset-0 m-auto size-5 text-subtle-foreground" />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${item.slug}`} className="line-clamp-2 text-label font-semibold hover:text-primary">
                {item.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {item.categoryName}
                {item.colors.length > 0 && ` · ${item.colors.join(", ")}`}
              </p>
            </div>
            <span className="text-label font-semibold whitespace-nowrap">{formatVnd(item.price)}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}
