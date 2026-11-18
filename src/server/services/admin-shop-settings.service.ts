import "server-only"
import { shippingStockSettingsSchema, tierSettingsSchema, type ShippingStockSettingsInput, type TierSettingsInput } from "@/lib/validators/admin-shop-settings"
import { adminContextSchema, type AdminContext } from "@/lib/validators/admin-catalog"
import { customerTier, type CustomerTier } from "@/lib/customer-tier"
import type { ShopSettings } from "@/lib/shop-settings"
import { db } from "@/server/db"
import { parseInput } from "./admin-catalog.service"
import { PAID_SPEND_WHERE } from "./customer-spend"
import { getShopSettings, SHOP_SETTINGS_ID } from "./shop-settings.service"

/*
 * Admin: sửa quy tắc cửa hàng (một dòng id "default", upsert). Service không tự kiểm quyền (Server Action gọi getAdminUser() trước).
 * Hai nhóm lưu riêng để mỗi tab chỉ ghi phần của nó, không ghi đè phần kia.
 */
export async function updateShippingStockSettings(admin: AdminContext, input: ShippingStockSettingsInput): Promise<ShopSettings> {
  parseInput(adminContextSchema, admin)
  const data = parseInput(shippingStockSettingsSchema, input)
  await db.shopSettings.upsert({ where: { id: SHOP_SETTINGS_ID }, create: { id: SHOP_SETTINGS_ID, ...data }, update: data })
  return getShopSettings()
}

export async function updateTierSettings(admin: AdminContext, input: TierSettingsInput): Promise<ShopSettings> {
  parseInput(adminContextSchema, admin)
  const data = parseInput(tierSettingsSchema, input)
  await db.shopSettings.upsert({ where: { id: SHOP_SETTINGS_ID }, create: { id: SHOP_SETTINGS_ID, ...data }, update: data })
  return getShopSettings()
}

/** Chuyển bản nháp ở form thành `tiers` để đếm khách (cùng quy tắc kiểm tra như khi lưu). */
function draftToTiers(d: ReturnType<typeof tierSettingsSchema.parse>): ShopSettings["tiers"] {
  return {
    MEMBER: { minSpend: 0, freeShippingThreshold: d.memberFreeShipThreshold },
    SILVER: { minSpend: d.silverMinSpend, freeShippingThreshold: d.silverFreeShipThreshold },
    GOLD: { minSpend: d.goldMinSpend, freeShippingThreshold: d.goldFreeShipThreshold },
    DIAMOND: { minSpend: d.diamondMinSpend, freeShippingThreshold: d.diamondFreeShipThreshold },
  }
}

export interface TierImpact {
  /** Số khách tính theo hạng hiện hành, rồi theo bản nháp. */
  current: Record<CustomerTier, number>
  draft: Record<CustomerTier, number>
  /** Số khách đổi hạng nếu lưu bản nháp. */
  changed: number
}

const emptyCounts = (): Record<CustomerTier, number> => ({ MEMBER: 0, SILVER: 0, GOLD: 0, DIAMOND: 0 })

/** Xem trước tác động đổi mức chi tiêu: một câu truy vấn gom chi tiêu của mọi khách, phân hạng ở bộ nhớ (không N+1). */
export async function previewTierImpact(admin: AdminContext, input: TierSettingsInput): Promise<TierImpact> {
  parseInput(adminContextSchema, admin)
  const draft = draftToTiers(parseInput(tierSettingsSchema, input))
  const current = (await getShopSettings()).tiers
  const [customers, spends] = await Promise.all([
    db.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true } }),
    db.order.groupBy({ by: ["userId"], where: { ...PAID_SPEND_WHERE, user: { role: "CUSTOMER" } }, _sum: { total: true } }),
  ])
  const spendOf = new Map(spends.map((s) => [s.userId, s._sum.total ?? 0]))
  const res: TierImpact = { current: emptyCounts(), draft: emptyCounts(), changed: 0 }
  for (const c of customers) {
    const spend = spendOf.get(c.id) ?? 0
    const a = customerTier(spend, current)
    const b = customerTier(spend, draft)
    res.current[a]++
    res.draft[b]++
    if (a !== b) res.changed++
  }
  return res
}

/** Mã voucher chào mừng đang bật của từng hạng (chỉ đọc, hiện ở tab Hạng thành viên). */
export async function listWelcomeVouchersByTier(): Promise<Record<CustomerTier, { code: string }[]>> {
  const rows = await db.voucher.findMany({
    where: { welcomeTier: { not: null }, isActive: true },
    select: { code: true, welcomeTier: true },
    orderBy: { createdAt: "asc" },
  })
  const res: Record<CustomerTier, { code: string }[]> = { MEMBER: [], SILVER: [], GOLD: [], DIAMOND: [] }
  for (const r of rows) if (r.welcomeTier) res[r.welcomeTier].push({ code: r.code })
  return res
}
