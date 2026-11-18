import { formatVnd } from "@/lib/format"
import { orderStatusMessage } from "@/lib/notification"
import type { OrderStatusValue } from "@/types/order"

/*
 * Mẫu email đơn hàng (tiếng Việt, tông kem/nâu/vàng đồng của cửa hàng). Hàm THUẦN: nhận dữ liệu, trả { subject, html, text }.
 * Tiêu đề và câu mở đầu dùng chung với thông báo trên chuông (orderStatusMessage) để hai nơi luôn khớp.
 * Mọi chuỗi từ dữ liệu người dùng (tên, địa chỉ, tên sản phẩm) đều được escape HTML.
 */

export interface OrderEmailData {
  siteName: string
  code: string
  /** Đường dẫn tuyệt đối tới trang chi tiết đơn. */
  orderUrl: string
  subtotal: number
  shippingFee: number
  /** Số tiền voucher đã giảm; 0 hoặc bỏ trống thì không hiện dòng. */
  discount?: number
  /** Số tiền mã vận chuyển đã giảm; 0 hoặc bỏ trống thì không hiện dòng. */
  shippingDiscount?: number
  total: number
  paymentLabel: string
  items: { productName: string; size: string; color: string; quantity: number; unitPrice: number }[]
  address: { fullName: string; phone: string; street: string; ward: string; province: string }
}

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

const INK = "#1c1917"
const BRAND = "#a16207"
const MUTED = "#57534e"
const BORDER = "#e7e0d5"
const BG = "#faf7f2"

export function renderOrderEmail(
  status: OrderStatusValue,
  d: OrderEmailData,
  /** Thay nội dung mặc định theo trạng thái (vd "đã nhận thanh toán" khi trạng thái đơn không đổi). */
  override?: { title: string; body: string }
): RenderedEmail {
  const message = override ?? orderStatusMessage(d.code, status)
  const title = message?.title ?? `Cập nhật đơn #${d.code}`
  const lead = message?.body ?? ""
  const subject = `[${d.siteName}] ${title}`
  const addressLine = [d.address.street, d.address.ward, d.address.province].join(", ")
  const shippingLabel = d.shippingFee === 0 ? "Miễn phí" : formatVnd(d.shippingFee)
  const discount = d.discount ?? 0
  const shippingDiscount = d.shippingDiscount ?? 0

  const itemRows = d.items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${INK}">${esc(i.productName)}<br><span style="font-size:12px;color:${MUTED}">Size ${esc(i.size)} · ${esc(i.color)} · SL ${i.quantity}</span></td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${INK};white-space:nowrap">${formatVnd(i.unitPrice * i.quantity)}</td>
      </tr>`,
    )
    .join("")

  const html = `<!doctype html>
<html lang="vi"><body style="margin:0;padding:24px;background:${BG};font-family:Arial,Helvetica,sans-serif;color:${INK}">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER}">
    <tr><td style="padding:24px 28px;border-bottom:1px solid ${BORDER};font-family:Georgia,serif;font-size:20px;letter-spacing:3px;text-transform:uppercase">${esc(d.siteName)}</td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-weight:600;line-height:1.2">${esc(title)}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED}">${esc(lead)}</p>
      <table role="presentation" width="100%">${itemRows}</table>
      <table role="presentation" width="100%" style="margin-top:12px;font-size:14px">
        <tr><td style="padding:4px 0;color:${MUTED}">Tạm tính</td><td align="right">${formatVnd(d.subtotal)}</td></tr>
        <tr><td style="padding:4px 0;color:${MUTED}">Phí vận chuyển</td><td align="right">${shippingLabel}</td></tr>${
          discount > 0 ? `\n        <tr><td style="padding:4px 0;color:${MUTED}">Voucher giảm giá</td><td align="right">-${formatVnd(discount)}</td></tr>` : ""
        }${
          shippingDiscount > 0 ? `\n        <tr><td style="padding:4px 0;color:${MUTED}">Voucher vận chuyển</td><td align="right">-${formatVnd(shippingDiscount)}</td></tr>` : ""
        }
        <tr><td style="padding:8px 0;font-weight:bold">Tổng cộng</td><td align="right" style="padding:8px 0;font-weight:bold;color:${BRAND};font-size:16px">${formatVnd(d.total)}</td></tr>
      </table>
      <p style="margin:20px 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${MUTED}">Giao tới</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6">${esc(d.address.fullName)} · ${esc(d.address.phone)}<br>${esc(addressLine)}</p>
      <p style="margin:0 0 24px;font-size:14px;color:${MUTED}">Thanh toán: ${esc(d.paymentLabel)}</p>
      <a href="${esc(d.orderUrl)}" style="display:inline-block;background:${INK};color:#ffffff;text-decoration:none;padding:12px 28px;font-size:14px;font-weight:bold">Xem chi tiết đơn hàng</a>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED}">Email tự động từ ${esc(d.siteName)}. Vui lòng không trả lời thư này.</td></tr>
  </table>
</body></html>`

  const text = [
    title,
    "",
    lead,
    "",
    ...d.items.map((i) => `- ${i.productName} (Size ${i.size}, ${i.color}) x${i.quantity}: ${formatVnd(i.unitPrice * i.quantity)}`),
    "",
    `Tạm tính: ${formatVnd(d.subtotal)}`,
    `Phí vận chuyển: ${shippingLabel}`,
    ...(discount > 0 ? [`Voucher giảm giá: -${formatVnd(discount)}`] : []),
    ...(shippingDiscount > 0 ? [`Voucher vận chuyển: -${formatVnd(shippingDiscount)}`] : []),
    `Tổng cộng: ${formatVnd(d.total)}`,
    "",
    `Giao tới: ${d.address.fullName} · ${d.address.phone}`,
    addressLine,
    `Thanh toán: ${d.paymentLabel}`,
    "",
    `Xem chi tiết đơn hàng: ${d.orderUrl}`,
  ].join("\n")

  return { subject, html, text }
}
