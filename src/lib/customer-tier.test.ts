import { describe, expect, it } from "vitest"
import {
  CUSTOMER_TIER_CONFIG,
  CUSTOMER_TIERS,
  customerTier,
  freeShippingThresholdFor,
  nextTier,
  spendToNextTier,
  tierAtLeast,
  tiersFrom,
} from "./customer-tier"

describe("customerTier", () => {
  it("dưới ngưỡng Bạc là MEMBER, mỗi hạng bắt đầu đúng ở ngưỡng của nó", () => {
    expect(customerTier(0)).toBe("MEMBER")
    expect(customerTier(CUSTOMER_TIER_CONFIG.SILVER.minSpend - 1)).toBe("MEMBER")
    expect(customerTier(CUSTOMER_TIER_CONFIG.SILVER.minSpend)).toBe("SILVER")
    expect(customerTier(CUSTOMER_TIER_CONFIG.GOLD.minSpend - 1)).toBe("SILVER")
    expect(customerTier(CUSTOMER_TIER_CONFIG.GOLD.minSpend)).toBe("GOLD")
    expect(customerTier(CUSTOMER_TIER_CONFIG.DIAMOND.minSpend - 1)).toBe("GOLD")
    expect(customerTier(CUSTOMER_TIER_CONFIG.DIAMOND.minSpend)).toBe("DIAMOND")
    expect(customerTier(CUSTOMER_TIER_CONFIG.DIAMOND.minSpend * 10)).toBe("DIAMOND")
  })

  it("ngưỡng tăng dần theo thứ tự hạng", () => {
    const mins = CUSTOMER_TIERS.map((t) => CUSTOMER_TIER_CONFIG[t].minSpend)
    expect(mins).toEqual([...mins].sort((a, b) => a - b))
    expect(mins[0]).toBe(0)
  })
})

describe("so sánh hạng", () => {
  it("tierAtLeast và tiersFrom theo thứ tự hạng", () => {
    expect(tierAtLeast("GOLD", "SILVER")).toBe(true)
    expect(tierAtLeast("SILVER", "GOLD")).toBe(false)
    expect(tierAtLeast("MEMBER", "MEMBER")).toBe(true)
    expect(tiersFrom("GOLD")).toEqual(["GOLD", "DIAMOND"])
    expect(tiersFrom("MEMBER")).toEqual([...CUSTOMER_TIERS])
  })

  it("nextTier và spendToNextTier", () => {
    expect(nextTier("MEMBER")).toBe("SILVER")
    expect(nextTier("DIAMOND")).toBeNull()
    expect(spendToNextTier(1_000_000)).toEqual({ tier: "SILVER", remaining: CUSTOMER_TIER_CONFIG.SILVER.minSpend - 1_000_000 })
    expect(spendToNextTier(CUSTOMER_TIER_CONFIG.GOLD.minSpend)).toEqual({ tier: "DIAMOND", remaining: CUSTOMER_TIER_CONFIG.DIAMOND.minSpend - CUSTOMER_TIER_CONFIG.GOLD.minSpend })
    expect(spendToNextTier(CUSTOMER_TIER_CONFIG.DIAMOND.minSpend)).toBeNull()
  })
})

describe("freeShippingThresholdFor", () => {
  it("hạng càng cao ngưỡng càng thấp, Kim cương luôn miễn phí", () => {
    const t = CUSTOMER_TIERS.map((x) => freeShippingThresholdFor(x))
    expect(t).toEqual([...t].sort((a, b) => b - a))
    expect(freeShippingThresholdFor("MEMBER")).toBe(500_000)
    expect(freeShippingThresholdFor("DIAMOND")).toBe(0)
  })
})
