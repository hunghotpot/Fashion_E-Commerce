import type { MetadataRoute } from "next"
import { POLICIES } from "@/lib/policies"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// Mới có các trang tĩnh. Thêm trang sản phẩm và danh mục (đọc từ cơ sở dữ liệu) ở đợt backend.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/products", "/hang-moi-ve", "/cau-hoi-thuong-gap", "/gioi-thieu", "/lien-he", ...POLICIES.map((p) => `/chinh-sach/${p.slug}`)]
  return pages.map((path) => ({ url: `${BASE}${path}` }))
}
