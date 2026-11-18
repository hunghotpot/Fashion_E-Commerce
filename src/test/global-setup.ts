import { execSync } from "node:child_process"
import { PrismaClient } from "@prisma/client"
import { databaseName, testDatabaseUrl } from "./test-db-url"

/*
 * Chạy MỘT lần trước toàn bộ test: dựng DB test riêng (tạo nếu chưa có), áp migration và nạp dữ liệu seed nếu DB còn trống.
 * Một số test tích hợp đọc dữ liệu seed (125 sản phẩm), số còn lại tự tạo và tự dọn dữ liệu của mình.
 * Chốt an toàn: từ chối chạy nếu tên DB không kết thúc bằng `_test`, để không bao giờ trỏ nhầm vào DB dev.
 */
export default async function setup() {
  const url = testDatabaseUrl()
  const name = databaseName(url)
  if (!name.endsWith("_test")) {
    throw new Error(`Từ chối chạy test: tên DB "${name}" không kết thúc bằng "_test". Đặt TEST_DATABASE_URL trỏ tới DB test.`)
  }

  // 1) Tạo DB test nếu chưa có (kết nối qua DB "postgres" của cùng máy chủ).
  const admin = new URL(url)
  admin.pathname = "/postgres"
  const adminClient = new PrismaClient({ datasources: { db: { url: admin.toString() } } })
  try {
    const found = await adminClient.$queryRawUnsafe<{ n: number }[]>(`SELECT 1 AS n FROM pg_database WHERE datname = '${name.replace(/'/g, "''")}'`)
    if (found.length === 0) await adminClient.$executeRawUnsafe(`CREATE DATABASE "${name.replace(/"/g, '""')}"`)
  } finally {
    await adminClient.$disconnect()
  }

  const env = { ...process.env, DATABASE_URL: url }

  // 2) Áp migration (idempotent).
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" })

  // 3) Seed nếu chưa có người dùng nào (DB mới tạo).
  const client = new PrismaClient({ datasources: { db: { url } } })
  try {
    const users = await client.user.count()
    if (users === 0) execSync("npx prisma db seed", { env, stdio: "pipe", timeout: 600_000 })
  } finally {
    await client.$disconnect()
  }
}
