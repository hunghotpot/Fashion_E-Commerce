import type { ProductFilters } from "@/lib/validators/product-filter"

/** Tiêu đề trang /products theo bộ lọc đang áp, để liên kết từ trang chủ (nổi bật, bộ sưu tập) đến nơi có tiêu đề đúng nhãn vừa bấm. */
export function listingTitle(f: Pick<ProductFilters, "q" | "featured" | "season">): string {
  if (f.q) return `Kết quả cho “${f.q}”`
  if (f.featured) return "Sản phẩm nổi bật"
  if (f.season.length === 2 && f.season.includes("thu") && f.season.includes("đông")) return "Bộ sưu tập Thu Đông"
  return "Tất cả sản phẩm"
}
