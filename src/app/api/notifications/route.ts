import { NextResponse } from "next/server"
import { getCurrentUser } from "@/server/auth/session"
import { listNotifications } from "@/server/services/notification.service"

// Chuông thông báo của người đang đăng nhập. Route này là nơi đọc cookie/session; service chỉ nhận userId.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập" } }, { status: 401 })
  return NextResponse.json(await listNotifications(user.id), { headers: { "Cache-Control": "no-store" } })
}
