// Phí vận chuyển đơn giản theo tổng tiền hàng. Gom một chỗ để thay bằng bảng phí theo vùng/trọng lượng sau này.

// Giá trị MẶC ĐỊNH; Admin chỉnh ở Cài đặt hệ thống (ShopSettings), xem server/services/shop-settings.service.ts.
export const FREE_SHIPPING_THRESHOLD = 500_000
export const FLAT_SHIPPING_FEE = 30_000

/**
 * Miễn phí từ `threshold` (mặc định 500.000đ của hạng Thành viên; hạng cao hơn có ngưỡng thấp hơn, xem customer-tier.ts),
 * dưới mức đó đồng giá 30.000đ. Giỏ rỗng không mất phí; ngưỡng 0 là luôn miễn phí.
 */
export function calculateShippingFee(subtotal: number, threshold: number = FREE_SHIPPING_THRESHOLD, flatFee: number = FLAT_SHIPPING_FEE): number {
  if (subtotal <= 0 || subtotal >= threshold) return 0
  return flatFee
}
