import { z } from "zod"

const MAX_MONEY = 1_000_000_000

const money = (label: string) =>
  z.coerce
    .number({ message: `${label} phải là số` })
    .int(`${label} phải là số nguyên`)
    .min(0, `${label} không được âm`)
    .max(MAX_MONEY, `${label} quá lớn`)

/** Kho và vận chuyển (tab "Vận chuyển & Kho"). Ngưỡng freeship nằm ở tab Hạng thành viên (hạng Thành viên). */
export const shippingStockSettingsSchema = z.object({
  lowStockThreshold: z.coerce.number({ message: "Ngưỡng tồn kho phải là số" }).int("Ngưỡng tồn kho phải là số nguyên").min(0, "Ngưỡng tồn kho không được âm").max(10_000, "Ngưỡng tồn kho quá lớn"),
  flatShippingFee: money("Phí vận chuyển"),
})
export type ShippingStockSettingsInput = z.input<typeof shippingStockSettingsSchema>

/** Hạng thành viên: mức chi tiêu tăng dần, ngưỡng freeship giảm dần (không tăng) theo hạng. */
export const tierSettingsSchema = z
  .object({
    silverMinSpend: money("Mức chi tiêu hạng Bạc"),
    goldMinSpend: money("Mức chi tiêu hạng Vàng"),
    diamondMinSpend: money("Mức chi tiêu hạng Kim cương"),
    memberFreeShipThreshold: money("Freeship hạng Thành viên"),
    silverFreeShipThreshold: money("Freeship hạng Bạc"),
    goldFreeShipThreshold: money("Freeship hạng Vàng"),
    diamondFreeShipThreshold: money("Freeship hạng Kim cương"),
  })
  .superRefine((v, ctx) => {
    if (v.silverMinSpend <= 0) ctx.addIssue({ code: "custom", message: "Mức chi tiêu hạng Bạc phải lớn hơn 0", path: ["silverMinSpend"] })
    if (v.goldMinSpend <= v.silverMinSpend) ctx.addIssue({ code: "custom", message: "Mức chi tiêu hạng Vàng phải cao hơn hạng Bạc", path: ["goldMinSpend"] })
    if (v.diamondMinSpend <= v.goldMinSpend) ctx.addIssue({ code: "custom", message: "Mức chi tiêu hạng Kim cương phải cao hơn hạng Vàng", path: ["diamondMinSpend"] })
    const free = [v.memberFreeShipThreshold, v.silverFreeShipThreshold, v.goldFreeShipThreshold, v.diamondFreeShipThreshold]
    for (let i = 1; i < free.length; i++) {
      if (free[i] > free[i - 1]) {
        const keys = ["memberFreeShipThreshold", "silverFreeShipThreshold", "goldFreeShipThreshold", "diamondFreeShipThreshold"] as const
        ctx.addIssue({ code: "custom", message: "Ngưỡng freeship của hạng cao hơn không được lớn hơn hạng thấp hơn", path: [keys[i]] })
      }
    }
  })
export type TierSettingsInput = z.input<typeof tierSettingsSchema>
