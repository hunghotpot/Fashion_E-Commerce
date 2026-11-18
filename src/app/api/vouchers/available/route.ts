import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getCurrentUser } from "@/server/auth/session"
import { listAvailableVouchers } from "@/server/services/voucher.service"

// Danh sách voucher khách có thể dùng cho phần hàng đang thanh toán: body { paymentMethod?, source? } → { vouchers }.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập" } }, { status: 401 })

  const body: unknown = await req.json().catch(() => ({}))
  try {
    return NextResponse.json({ vouchers: await listAvailableVouchers(user, body) })
  } catch (e) {
    if (e instanceof ZodError) return NextResponse.json({ vouchers: [] })
    throw e
  }
}
