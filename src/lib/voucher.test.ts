import { describe, expect, it } from "vitest"
import { voucherInputSchema } from "@/lib/validators/admin-voucher"
import { computeVoucherDiscount, describeVoucherBenefit, normalizeVoucherCode, toVnDateInput, vnDayBoundary, voucherStatus } from "./voucher"

describe("computeVoucherDiscount", () => {
  it("CASH không vượt quá tiền hàng", () => {
    expect(computeVoucherDiscount({ type: "CASH", value: 50_000, maxDiscount: null }, 200_000, 30_000)).toBe(50_000)
    expect(computeVoucherDiscount({ type: "CASH", value: 50_000, maxDiscount: null }, 30_000, 30_000)).toBe(30_000)
  })
  it("PERCENT làm tròn xuống và có trần", () => {
    expect(computeVoucherDiscount({ type: "PERCENT", value: 15, maxDiscount: null }, 99_999, 0)).toBe(14_999)
    expect(computeVoucherDiscount({ type: "PERCENT", value: 50, maxDiscount: 20_000 }, 200_000, 0)).toBe(20_000)
  })
  it("FREESHIP chỉ trừ phí vận chuyển; miễn phí rồi thì 0", () => {
    expect(computeVoucherDiscount({ type: "FREESHIP", value: 40_000, maxDiscount: null }, 100_000, 30_000)).toBe(30_000)
    expect(computeVoucherDiscount({ type: "FREESHIP", value: 40_000, maxDiscount: null }, 600_000, 0)).toBe(0)
  })
})

describe("voucherStatus", () => {
  const now = new Date("2026-11-17T05:00:00Z")
  const base = { isActive: true, startsAt: null, expiresAt: null, usageLimit: null, usedCount: 0 }
  it("thứ tự ưu tiên: tắt > hết hạn > hết lượt > sắp diễn ra > hoạt động", () => {
    expect(voucherStatus({ ...base, isActive: false }, now)).toBe("DISABLED")
    expect(voucherStatus({ ...base, expiresAt: new Date("2026-11-01") }, now)).toBe("EXPIRED")
    expect(voucherStatus({ ...base, usageLimit: 2, usedCount: 2 }, now)).toBe("EXHAUSTED")
    expect(voucherStatus({ ...base, startsAt: new Date("2026-12-01") }, now)).toBe("UPCOMING")
    expect(voucherStatus(base, now)).toBe("ACTIVE")
  })
})

describe("tiện ích", () => {
  it("chuẩn hoá mã và mô tả mức giảm", () => {
    expect(normalizeVoucherCode(" thu dong ")).toBe("THUDONG")
    expect(describeVoucherBenefit({ type: "PERCENT", value: 20, maxDiscount: 500_000 })).toContain("20%")
  })
  it("ngày giờ Việt Nam: cuối ngày hết hạn vẫn còn hiệu lực đến 23:59 giờ VN", () => {
    expect(vnDayBoundary("2026-12-31", "end").toISOString()).toBe("2026-12-31T16:59:59.999Z")
    expect(toVnDateInput(vnDayBoundary("2026-12-31", "end"))).toBe("2026-12-31")
    expect(toVnDateInput(null)).toBe("")
  })
})

describe("voucherInputSchema", () => {
  const ok = { code: " abc-12 ", name: "Thử", type: "PERCENT", value: 10, maxDiscount: 1000, minOrder: 0, categoryId: null, firstOrderOnly: false, usageLimit: null, startsAt: "", expiresAt: "", isActive: true }
  it("chuẩn hoá mã, bỏ maxDiscount khi không phải PERCENT", () => {
    const r = voucherInputSchema.parse(ok)
    expect(r.code).toBe("ABC-12")
    expect(voucherInputSchema.parse({ ...ok, type: "CASH" }).maxDiscount).toBeNull()
  })
  it("từ chối: mã có dấu cách giữa/ký tự lạ, % > 100, hạn trước ngày bắt đầu", () => {
    expect(voucherInputSchema.safeParse({ ...ok, code: "a$" }).success).toBe(false)
    expect(voucherInputSchema.safeParse({ ...ok, value: 101 }).success).toBe(false)
    expect(voucherInputSchema.safeParse({ ...ok, startsAt: "2026-12-10", expiresAt: "2026-12-01" }).success).toBe(false)
  })
})
