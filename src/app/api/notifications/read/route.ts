import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getCurrentUser } from "@/server/auth/session"
import { markNotificationsRead } from "@/server/services/notification.service"

// Đánh dấu đã đọc: body { ids?: string[] }; không có ids = tất cả thông báo của người dùng.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập" } }, { status: 401 })

  const body: unknown = await req.json().catch(() => ({}))
  try {
    const marked = await markNotificationsRead(user.id, body)
    return NextResponse.json({ marked })
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: e.issues[0]?.message ?? "Dữ liệu không hợp lệ" } }, { status: 400 })
    }
    throw e
  }
}
