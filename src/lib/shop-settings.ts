import { CUSTOMER_TIER_CONFIG, type TierRules } from "@/lib/customer-tier"
import { LOW_STOCK_THRESHOLD } from "@/lib/inventory"
import { FLAT_SHIPPING_FEE } from "@/lib/shipping"

/*
 * Quy tắc cửa hàng do Admin chỉnh ở Cài đặt hệ thống (bảng ShopSettings). Kiểu và giá trị mặc định dùng được cả ở client;
 * đọc/ghi DB nằm ở server/services/shop-settings.service.ts. Ngưỡng freeship mặc định của cửa hàng = ngưỡng hạng Thành viên.
 */
export interface ShopSettings {
  lowStockThreshold: number
  flatShippingFee: number
  tiers: TierRules
}

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  lowStockThreshold: LOW_STOCK_THRESHOLD,
  flatShippingFee: FLAT_SHIPPING_FEE,
  tiers: {
    MEMBER: { minSpend: 0, freeShippingThreshold: CUSTOMER_TIER_CONFIG.MEMBER.freeShippingThreshold },
    SILVER: { minSpend: CUSTOMER_TIER_CONFIG.SILVER.minSpend, freeShippingThreshold: CUSTOMER_TIER_CONFIG.SILVER.freeShippingThreshold },
    GOLD: { minSpend: CUSTOMER_TIER_CONFIG.GOLD.minSpend, freeShippingThreshold: CUSTOMER_TIER_CONFIG.GOLD.freeShippingThreshold },
    DIAMOND: { minSpend: CUSTOMER_TIER_CONFIG.DIAMOND.minSpend, freeShippingThreshold: CUSTOMER_TIER_CONFIG.DIAMOND.freeShippingThreshold },
  },
}

/** Ngưỡng miễn phí vận chuyển mặc định (khách chưa có hạng, trang chủ, chính sách, FAQ) = hạng Thành viên. */
export const defaultFreeShippingThreshold = (s: ShopSettings): number => s.tiers.MEMBER.freeShippingThreshold
