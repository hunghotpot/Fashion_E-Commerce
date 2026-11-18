import type { MetadataRoute } from "next"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// Cho công cụ tìm kiếm đọc phần công khai; chặn khu vực cần đăng nhập và API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/cart", "/checkout", "/orders", "/dev"] }],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
