import "server-only"
import { formatVnd } from "@/lib/format"
import { BANK_TRANSFER_WINDOW_HOURS, transferContent } from "@/lib/order"
import { db } from "@/server/db"
import { notifyAdmins } from "@/server/services/admin-notification.service"
import { cancelExpiredOrder, OrderError } from "@/server/services/order.service"

/*
 * Thanh toán chuyển khoản (VietQR): huỷ đơn quá hạn và ghi nhận "Tôi đã chuyển khoản" của khách.
 * Admin mới là người xác nhận đã nhận tiền (xem admin-order.service).
 */

/**
 * Huỷ đơn chuyển khoản quá BANK_TRANSFER_WINDOW_HOURS mà Admin chưa xác nhận đã nhận tiền, hoàn tồn kho (và lượt voucher).
 * Chỉ đơn còn PENDING: đơn Admin đã duyệt/xử lý thì để Admin quyết. An toàn khi chạy nhiều lần/đồng thời (lõi huỷ có điều kiện trong UPDATE).
 */
export async function expireUnpaidBankTransferOrders(now: Date = new Date()): Promise<{ cancelled: number }> {
  const cutoff = new Date(now.getTime() - BANK_TRANSFER_WINDOW_HOURS * 3_600_000)
  const due = await db.order.findMany({
    where: { paymentMethod: "BANK_TRANSFER", status: "PENDING", paymentStatus: { in: ["PENDING", "FAILED"] }, createdAt: { lt: cutoff } },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true },
  })

  let cancelled = 0
  for (const { id } of due) {
    try {
      await cancelExpiredOrder(id)
      cancelled += 1
    } catch (e) {
      if (e instanceof OrderError && (e.code === "CANNOT_CANCEL" || e.code === "ORDER_NOT_FOUND")) continue
      throw e
    }
  }
  return { cancelled }
}

/** Dọn đơn quá hạn thanh toán (hiện chỉ có chuyển khoản, hạn 24 giờ). */
export async function expireUnpaidOrders(now: Date = new Date()): Promise<{ cancelled: number }> {
  return expireUnpaidBankTransferOrders(now)
}

/**
 * Khách bấm "Tôi đã chuyển khoản": chỉ GHI NHẬN thời điểm và báo Admin (chuông), KHÔNG đổi paymentStatus (chỉ Admin xác nhận đã nhận tiền).
 * Chỉ chủ đơn BANK_TRANSFER còn chờ tiền. Idempotent: bấm lại không tạo thêm thông báo, trả về thời điểm đã ghi.
 */
export async function reportBankTransferPaid(user: { id: string }, orderId: string): Promise<{ reportedAt: Date }> {
  return db.$transaction(async (tx) => {
    // Quyền: chỉ chủ đơn tìm thấy đơn (người khác nhận ORDER_NOT_FOUND, không lộ sự tồn tại).
    const order = await tx.order.findFirst({
      where: { id: orderId, userId: user.id },
      select: { id: true, code: true, total: true, status: true, paymentMethod: true, paymentStatus: true, customerReportedPaidAt: true },
    })
    if (!order) throw new OrderError("ORDER_NOT_FOUND", "Không tìm thấy đơn hàng")
    if (order.paymentMethod !== "BANK_TRANSFER") throw new OrderError("CANNOT_PAY", "Đơn này không thanh toán bằng chuyển khoản")
    if (order.status === "CANCELLED") throw new OrderError("CANNOT_PAY", "Đơn đã huỷ nên không thể báo chuyển khoản")
    if (order.paymentStatus !== "PENDING") throw new OrderError("CANNOT_PAY", "Đơn này không còn chờ thanh toán")
    if (order.customerReportedPaidAt) return { reportedAt: order.customerReportedPaidAt }

    const now = new Date()
    // Điều kiện "chưa báo" nằm trong câu UPDATE: hai lần bấm đồng thời chỉ một lần ghi và tạo thông báo.
    const res = await tx.order.updateMany({ where: { id: order.id, customerReportedPaidAt: null }, data: { customerReportedPaidAt: now } })
    if (res.count === 1) {
      await notifyAdmins(tx, {
        category: "PAYMENT",
        title: `Khách báo đã chuyển khoản #${order.code}`,
        body: `${formatVnd(order.total)}, nội dung ${transferContent(order.code)}. Đối chiếu sao kê rồi xác nhận đã nhận tiền.`,
        href: `/admin/orders/${order.id}`,
      })
    }
    return { reportedAt: now }
  })
}

/** Lúc khách đã báo chuyển khoản (null = chưa báo), chỉ cho chủ đơn. Dùng ở trang QR để nút "Tôi đã chuyển khoản" nhớ trạng thái. */
export async function getTransferReportedAt(userId: string, orderId: string): Promise<Date | null> {
  const row = await db.order.findFirst({ where: { id: orderId, userId }, select: { customerReportedPaidAt: true } })
  return row?.customerReportedPaidAt ?? null
}
