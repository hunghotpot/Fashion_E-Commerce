import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { deleteOldAdminNotifications } from "@/server/services/admin-notification.service"
import { expireUnpaidOrders } from "@/server/services/payment.service"

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // chưa đặt secret thì route bị khoá hoàn toàn
  const given = Buffer.from(req.headers.get("authorization") ?? "")
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

// Huỷ đơn quá hạn thanh toán (VNPay 15 phút, chuyển khoản 24 giờ) + hoàn tồn kho, rồi dọn thông báo Admin quá hạn lưu.
// Gọi định kỳ (cron/scheduler): GET kèm "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { cancelled } = await expireUnpaidOrders()
  const { deleted } = await deleteOldAdminNotifications()
  return NextResponse.json({ cancelled, notificationsDeleted: deleted })
}
