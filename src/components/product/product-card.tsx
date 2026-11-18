import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { RatingLine } from "@/components/review/star-rating"
import { FadeImage } from "@/components/ui/fade-image"
import { formatVnd, GENDER_LABEL } from "@/lib/format"
import type { ProductCardData } from "@/types/catalog"

const IMAGE_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"

// Ảnh dọc 4:5, tên và giá cùng một hàng, nhãn góc nhỏ (NEW / HẾT HÀNG), giá chuyển sang màu brand khi là hàng mới.
// "Xem nhanh" chỉ là gợi ý khi rê chuột/Tab (cả thẻ vốn là một liên kết tới trang sản phẩm), nên không phải nút riêng.
export function ProductCard({
  product,
  isNew = false,
  priority = false,
}: {
  product: ProductCardData
  isNew?: boolean
  /** Ảnh đầu trang (nhiều khả năng là LCP): tải ngay, không lazy. */
  priority?: boolean
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-xl bg-secondary">
        {product.image ? (
          <FadeImage
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes={IMAGE_SIZES}
            priority={priority}
            className={`object-cover transition-all duration-300 ${
              product.hoverImage ? "group-hover:opacity-0" : "group-hover:scale-105"
            }`}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-sm text-subtle-foreground">
            [Hình ảnh sản phẩm]
          </span>
        )}
        {product.hoverImage && (
          <Image
            src={product.hoverImage.url}
            alt={product.hoverImage.alt}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        {!product.inStock ? (
          <Badge shape="tag" variant="dark" className="absolute top-3 left-3">
            HẾT HÀNG
          </Badge>
        ) : (
          isNew && (
            <Badge shape="tag" variant="solid" className="absolute top-3 left-3">
              NEW
            </Badge>
          )
        )}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-3 bottom-3 hidden h-10 translate-y-3 place-items-center rounded-none bg-card/95 text-xs font-semibold tracking-[0.06em] uppercase opacity-0 shadow-card transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:hover)]:grid"
        >
          Xem nhanh
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="line-clamp-2 text-nav leading-snug font-semibold">{product.name}</h3>
          <p
            className={`shrink-0 text-nav font-semibold whitespace-nowrap tabular-nums ${isNew ? "text-primary" : "text-foreground"}`}
          >
            {formatVnd(product.price)}
          </p>
        </div>
        <p className="line-clamp-1 text-label text-subtle-foreground">
          {product.categoryName} • {GENDER_LABEL[product.gender]}
        </p>
        {product.rating && <RatingLine average={product.rating.average} count={product.rating.count} />}
      </div>
    </Link>
  )
}
