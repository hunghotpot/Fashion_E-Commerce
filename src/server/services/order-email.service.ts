import "server-only"
import { paymentConfirmedMessage } from "@/lib/notification"
import { PAYMENT_METHOD_LABEL } from "@/lib/order"
import { SITE_NAME } from "@/lib/site"
import { db } from "@/server/db"
import { getMailStatus } from "@/server/mail/env"
import { sendMail } from "@/server/mail/send"
import { renderOrderEmail } from "@/server/mail/templates/order-email"
import type { OrderAddressSnapshot, OrderStatusValue } from "@/types/order"

/*
 * Email cho chủ đơn khi đơn được đặt (PENDING) hoặc đổi trạng thái. MẶC ĐỊNH TẮT (MAIL_ENABLED, xem src/server/mail/env.ts).
 * Gọi SAU KHI transaction đã commit (đặt đơn / đổi trạng thái / huỷ / VNPay thành công), không chờ kết quả:
 * email lỗi hay chậm không được làm hỏng đơn hàng. Hàm này không bao giờ ném lỗi; chỉ log mã đơn và lý do, không log địa chỉ hay nội dung.
 */
export async function sendOrderEmail(orderId: string, status: OrderStatusValue, event?: "PAYMENT_CONFIRMED"): Promise<void> {
  try {
    const mail = getMailStatus()
    if (!mail.enabled) return

    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        code: true,
        subtotal: true,
        shippingFee: true,
        discount: true,
        shippingDiscount: true,
        total: true,
        paymentMethod: true,
        shippingAddress: true,
        user: { select: { email: true } },
        items: { select: { productName: true, size: true, color: true, quantity: true, unitPrice: true } },
      },
    })
    if (!order) return

    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "")
    const rendered = renderOrderEmail(
      status,
      {
        siteName: SITE_NAME,
        code: order.code,
        orderUrl: `${base}/account/orders/${orderId}`,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discount: order.discount,
        shippingDiscount: order.shippingDiscount,
        total: order.total,
        paymentLabel: PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod,
        items: order.items,
        address: order.shippingAddress as unknown as OrderAddressSnapshot,
      },
      event === "PAYMENT_CONFIRMED" ? paymentConfirmedMessage(order.code) : undefined
    )

    const result = await sendMail({ to: order.user.email, ...rendered }, mail)
    if (!result.sent) console.warn(`[mail] không gửi được email đơn ${order.code}: ${result.reason}`)
  } catch (e) {
    console.warn(`[mail] lỗi khi soạn email đơn ${orderId}: ${e instanceof Error ? e.message.slice(0, 200) : "không rõ"}`)
  }
}
