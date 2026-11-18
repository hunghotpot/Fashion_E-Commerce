"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/action-result"
import { orderIdSchema } from "@/lib/validators/order-list"
import { getCurrentUser } from "@/server/auth/session"
import { OrderError } from "@/server/services/order.service"
import { reportBankTransferPaid } from "@/server/services/payment.service"

/** Khách báo "Tôi đã chuyển khoản": ghi nhận và báo Admin, không đổi trạng thái thanh toán. */
export async function reportBankTransferAction(orderId: unknown): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }
  const id = orderIdSchema.safeParse(orderId)
  if (!id.success) return { ok: false, message: "Đơn hàng không hợp lệ" }

  try {
    await reportBankTransferPaid(user, id.data)
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, message: e.message }
    throw e
  }
  revalidatePath(`/orders/${id.data}/payment`)
  return { ok: true, message: "Đã báo cho cửa hàng. Cửa hàng sẽ xác nhận sau khi đối chiếu tiền về." }
}
