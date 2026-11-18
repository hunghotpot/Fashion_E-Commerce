import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { DEFAULT_SHOP_SETTINGS } from "@/lib/shop-settings"
import { shippingStockSettingsSchema, tierSettingsSchema } from "@/lib/validators/admin-shop-settings"
import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { AdminCatalogError } from "./admin-catalog.service"
import { listWelcomeVouchersByTier, previewTierImpact, updateShippingStockSettings, updateTierSettings } from "./admin-shop-settings.service"
import { getShippingFee, getShippingTerms } from "./customer-spend"
import { getShopSettings, SHOP_SETTINGS_ID } from "./shop-settings.service"

/*
 * Test tích hợp: bảng cấu hình ShopSettings (một dòng). Xoá dòng trước mỗi ca và sau khi xong để các test khác thấy mặc định.
 */
const ADMIN = { userId: "admin-test" }
const fx = createFixtures()

const tiers = {
  silverMinSpend: 1_000_000,
  goldMinSpend: 2_000_000,
  diamondMinSpend: 3_000_000,
  memberFreeShipThreshold: 200_000,
  silverFreeShipThreshold: 100_000,
  goldFreeShipThreshold: 50_000,
  diamondFreeShipThreshold: 0,
}

beforeEach(async () => {
  await db.shopSettings.deleteMany({ where: { id: SHOP_SETTINGS_ID } })
})
afterAll(async () => {
  await db.shopSettings.deleteMany({ where: { id: SHOP_SETTINGS_ID } })
  await fx.cleanup()
  await db.$disconnect()
})

async function spend(userId: string, amount: number) {
  await db.order.create({
    data: {
      code: `S-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: amount,
      shippingFee: 0,
      total: amount,
      shippingAddress: {},
      paymentMethod: "COD",
    },
  })
}

describe("getShopSettings", () => {
  it("chưa có dòng cấu hình thì trả mặc định trong code", async () => {
    expect(await getShopSettings()).toEqual(DEFAULT_SHOP_SETTINGS)
  })
})

describe("updateShippingStockSettings / updateTierSettings", () => {
  it("lưu hai nhóm riêng: nhóm này không ghi đè nhóm kia, vẫn một dòng duy nhất", async () => {
    await updateShippingStockSettings(ADMIN, { flatShippingFee: "25000", lowStockThreshold: "4" })
    const after = await updateTierSettings(ADMIN, tiers)
    expect(after.flatShippingFee).toBe(25_000)
    expect(after.lowStockThreshold).toBe(4)
    expect(after.tiers.SILVER).toEqual({ minSpend: 1_000_000, freeShippingThreshold: 100_000 })
    expect(after.tiers.MEMBER).toEqual({ minSpend: 0, freeShippingThreshold: 200_000 })
    expect(await db.shopSettings.count()).toBe(1)
  })

  it("input sai bị từ chối và không ghi gì", async () => {
    await expect(updateShippingStockSettings(ADMIN, { flatShippingFee: "-1", lowStockThreshold: "4" })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(updateTierSettings(ADMIN, { ...tiers, goldMinSpend: 500_000 })).rejects.toMatchObject({ code: "INVALID_INPUT" })
    await expect(updateTierSettings(ADMIN, { ...tiers, silverFreeShipThreshold: 900_000 })).rejects.toMatchObject({ code: "INVALID_INPUT" })
    expect(await db.shopSettings.count()).toBe(0)
  })
})

describe("cấu hình có hiệu lực ở nghiệp vụ", () => {
  it("phí ship và ngưỡng freeship theo hạng đọc từ cấu hình", async () => {
    const v = await fx.makeVariant(10, 100_000)
    const b = await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])
    await updateShippingStockSettings(ADMIN, { flatShippingFee: 15_000, lowStockThreshold: 10 })
    await updateTierSettings(ADMIN, tiers)

    expect(await getShippingTerms(b.user.id)).toEqual({ freeShippingThreshold: 200_000, flatShippingFee: 15_000 })
    expect(await getShippingFee(b.user.id, 150_000)).toBe(15_000)
    expect(await getShippingFee(b.user.id, 200_000)).toBe(0)

    await spend(b.user.id, 1_500_000) // đủ hạng Bạc theo mức mới (mặc định thì chưa đủ)
    expect(await getShippingTerms(b.user.id)).toEqual({ freeShippingThreshold: 100_000, flatShippingFee: 15_000 })
    expect(await getShippingFee(b.user.id, 120_000)).toBe(0)
    expect(await getShippingFee(b.user.id, 80_000)).toBe(15_000)
  })
})

describe("previewTierImpact", () => {
  it("đếm khách đổi hạng nếu lưu bản nháp, không ghi gì", async () => {
    const v = await fx.makeVariant(10, 100_000)
    const b = await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])
    await spend(b.user.id, 1_500_000)
    const before = await previewTierImpact(ADMIN, { ...tiers, silverMinSpend: DEFAULT_SHOP_SETTINGS.tiers.SILVER.minSpend, goldMinSpend: DEFAULT_SHOP_SETTINGS.tiers.GOLD.minSpend, diamondMinSpend: DEFAULT_SHOP_SETTINGS.tiers.DIAMOND.minSpend })
    expect(before.changed).toBe(0)

    const res = await previewTierImpact(ADMIN, tiers)
    expect(res.changed).toBeGreaterThanOrEqual(1) // khách 1,5 triệu: Thành viên → Bạc
    expect(res.draft.SILVER).toBeGreaterThan(res.current.SILVER)
    expect(await db.shopSettings.count()).toBe(0)
  })
})

describe("listWelcomeVouchersByTier", () => {
  it("gom mã voucher chào mừng đang bật theo hạng", async () => {
    const code = `WLC${Date.now().toString(36).toUpperCase()}`
    const off = await db.voucher.create({ data: { code: `${code}X`, name: "tắt", type: "CASH", value: 1000, welcomeTier: "GOLD", isActive: false } })
    const on = await db.voucher.create({ data: { code, name: "bật", type: "CASH", value: 1000, welcomeTier: "GOLD" } })
    try {
      const res = await listWelcomeVouchersByTier()
      expect(res.GOLD.map((x) => x.code)).toContain(code)
      expect(res.GOLD.map((x) => x.code)).not.toContain(off.code)
    } finally {
      await db.voucher.deleteMany({ where: { id: { in: [on.id, off.id] } } })
    }
  })
})

describe("schema", () => {
  it("chấp nhận chuỗi số và bỏ qua khoảng trắng; từ chối số lẻ, quá lớn", () => {
    expect(shippingStockSettingsSchema.safeParse({ flatShippingFee: "30000", lowStockThreshold: "10" }).success).toBe(true)
    expect(shippingStockSettingsSchema.safeParse({ flatShippingFee: 1.5, lowStockThreshold: 10 }).success).toBe(false)
    expect(shippingStockSettingsSchema.safeParse({ flatShippingFee: 2_000_000_000, lowStockThreshold: 10 }).success).toBe(false)
    expect(tierSettingsSchema.safeParse(tiers).success).toBe(true)
    expect(tierSettingsSchema.safeParse({ ...tiers, silverMinSpend: 0 }).success).toBe(false)
  })
})
