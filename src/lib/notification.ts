import { formatVnd } from "@/lib/format"
import type { OrderStatusValue } from "@/types/order"

/** Số thông báo mới nhất trả về cho chuông. */
export const NOTIFICATION_LIMIT = 20

/** Tóm tắt đơn đưa vào nội dung thông báo: tổng tiền (VND) và tổng số sản phẩm. */
export interface OrderSummary {
  total: number
  itemCount: number
}

/**
 * Nội dung thông báo khi đơn có trạng thái `to` (PENDING = vừa đặt đơn). `summary` có thì thêm dòng tổng tiền và số sản phẩm
 * để khách không cần mở chi tiết đơn cũng biết đơn nào. null = trạng thái này không báo.
 */
export function orderStatusMessage(
  code: string,
  to: OrderStatusValue,
  summary?: OrderSummary
): { title: string; body: string } | null {
  const tail = summary ? ` Tổng ${formatVnd(summary.total)} (${summary.itemCount} sản phẩm).` : ""
  switch (to) {
    case "PENDING":
      return { title: `Đặt hàng thành công, đơn #${code}`, body: `Cửa hàng sẽ xác nhận đơn của bạn sớm nhất.${tail}` }
    case "CONFIRMED":
      return { title: `Đơn #${code} đã được xác nhận`, body: `Cửa hàng đang chuẩn bị hàng cho bạn.${tail}` }
    case "SHIPPING":
      return { title: `Đơn #${code} đang được giao`, body: `Đơn hàng đã được giao cho đơn vị vận chuyển.${tail}` }
    case "DELIVERED":
      return { title: `Đơn #${code} đã giao thành công`, body: `Cảm ơn bạn đã mua sắm. Bạn có thể mua lại đơn này bất cứ lúc nào.${tail}` }
    case "CANCELLED":
      return { title: `Đơn #${code} đã được huỷ`, body: `Số lượng hàng của đơn đã được hoàn lại kho.${tail}` }
    default:
      return null
  }
}

/** Thông báo khi cửa hàng xác nhận đã nhận tiền chuyển khoản (trạng thái đơn không đổi nên không đi qua orderStatusMessage). */
export function paymentConfirmedMessage(code: string, summary?: OrderSummary): { title: string; body: string } {
  const tail = summary ? ` Tổng ${formatVnd(summary.total)} (${summary.itemCount} sản phẩm).` : ""
  return { title: `Đã nhận thanh toán đơn #${code}`, body: `Cửa hàng đã xác nhận nhận được tiền chuyển khoản của bạn.${tail}` }
}

/** "Vừa xong", "5 phút trước", "2 giờ trước", "Hôm qua", hoặc ngày dd/mm/yyyy. */
export function formatRelativeTime(from: Date | string, now: Date = new Date()): string {
  const date = typeof from === "string" ? new Date(from) : from
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))
  if (seconds < 60) return "Vừa xong"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Hôm qua"
  if (days < 7) return `${days} ngày trước`
  return date.toLocaleDateString("vi-VN")
}
