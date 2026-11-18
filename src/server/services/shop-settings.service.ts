import "server-only"
import type { PrismaClient } from "@prisma/client"
import { DEFAULT_SHOP_SETTINGS, type ShopSettings } from "@/lib/shop-settings"
import { db } from "@/server/db"

export const SHOP_SETTINGS_ID = "default"

type Row = Awaited<ReturnType<PrismaClient["shopSettings"]["findUniqueOrThrow"]>>

export function toShopSettings(row: Row): ShopSettings {
  return {
    lowStockThreshold: row.lowStockThreshold,
    flatShippingFee: row.flatShippingFee,
    tiers: {
      MEMBER: { minSpend: 0, freeShippingThreshold: row.memberFreeShipThreshold },
      SILVER: { minSpend: row.silverMinSpend, freeShippingThreshold: row.silverFreeShipThreshold },
      GOLD: { minSpend: row.goldMinSpend, freeShippingThreshold: row.goldFreeShipThreshold },
      DIAMOND: { minSpend: row.diamondMinSpend, freeShippingThreshold: row.diamondFreeShipThreshold },
    },
  }
}

/** Quy tắc cửa hàng hiện hành. Chưa có dòng cấu hình thì dùng mặc định trong code. Truyền `client` để chạy trong transaction. */
export async function getShopSettings(client: Pick<PrismaClient, "shopSettings"> = db): Promise<ShopSettings> {
  const row = await client.shopSettings.findUnique({ where: { id: SHOP_SETTINGS_ID } })
  return row ? toShopSettings(row) : DEFAULT_SHOP_SETTINGS
}
