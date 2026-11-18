import { loadEnv } from "vite"

/**
 * URL của DB dành riêng cho test. Ưu tiên TEST_DATABASE_URL; nếu không có thì lấy DATABASE_URL (DB dev) và thêm hậu tố `_test`
 * vào tên DB (fashion → fashion_test). Nhờ vậy `npm test` không bao giờ đụng dữ liệu dev (giỏ hàng, đơn, ảnh tải lên...).
 */
export function testDatabaseUrl(): string {
  const env = loadEnv("test", process.cwd(), "")
  const explicit = process.env.TEST_DATABASE_URL ?? env.TEST_DATABASE_URL
  const base = explicit ?? process.env.DATABASE_URL ?? env.DATABASE_URL
  if (!base) throw new Error("Thiếu DATABASE_URL (hoặc TEST_DATABASE_URL) trong .env để chạy test.")
  const url = new URL(base)
  const name = url.pathname.replace(/^\//, "") || "fashion"
  if (!explicit) url.pathname = `/${name.endsWith("_test") ? name : `${name}_test`}`
  return url.toString()
}

/** Tên DB trong URL (không có dấu `/`). */
export function databaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "")
}
