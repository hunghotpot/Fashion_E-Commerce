import { NextResponse } from "next/server"
import { ZodError } from "zod"
import type { VoucherPreviewResponse } from "@/lib/voucher"
import { getCurrentUser } from "@/server/auth/session"
import { previewVoucher, VoucherError } from "@/server/services/voucher.service"

// Xem trước voucher trên giỏ hiện tại: body { code, paymentMethod? }. Lỗi nghiệp vụ trả 200 { ok:false, message } để UI hiện thẳng cho khách.
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập" } }, { status: 401 })

  const body: unknown = await req.json().catch(() => ({}))
  try {
    const preview = await previewVoucher(user, body)
    return NextResponse.json({ ok: true, preview } satisfies VoucherPreviewResponse)
  } catch (e) {
    if (e instanceof VoucherError) return NextResponse.json({ ok: false, message: e.message } satisfies VoucherPreviewResponse)
    if (e instanceof ZodError) {
      return NextResponse.json({ ok: false, message: e.issues[0]?.message ?? "Mã giảm giá không hợp lệ" } satisfies VoucherPreviewResponse)
    }
    throw e
  }
}
