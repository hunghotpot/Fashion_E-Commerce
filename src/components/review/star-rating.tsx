import { StarIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatRating } from "@/lib/review"

/**
 * Hàng 5 sao chỉ để xem (không bấm được). Sao đầy = màu brand, sao rỗng = viền xám; làm tròn tới sao nguyên gần nhất.
 * Cả hàng là MỘT ảnh có nhãn đọc được ("Đánh giá 4,5 trên 5 sao"); từng sao là trang trí. Mức sao không chỉ dựa vào màu:
 * sao đầy có tô, sao rỗng chỉ có viền.
 */
export function StarRating({ value, className, iconClassName }: { value: number; className?: string; iconClassName?: string }) {
  const filled = Math.round(value)
  return (
    <span role="img" aria-label={`Đánh giá ${formatRating(value)} trên 5 sao`} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          aria-hidden
          className={cn("size-4", n <= filled ? "fill-brand text-brand" : "text-subtle-foreground", iconClassName)}
        />
      ))}
    </span>
  )
}

/** Dòng gọn "★★★★☆ 4,5 (12)" cho thẻ sản phẩm; không hiện gì khi chưa có đánh giá. */
export function RatingLine({ average, count, className }: { average: number; count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <p className={cn("flex items-center gap-1.5 text-label text-muted-foreground", className)}>
      <StarRating value={average} iconClassName="size-3.5" />
      <span className="tabular-nums">
        <span className="font-semibold text-foreground">{formatRating(average)}</span> ({count})
      </span>
    </p>
  )
}
