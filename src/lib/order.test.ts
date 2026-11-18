import { describe, expect, it } from "vitest"
import { paymentConfirmedMessage } from "./notification"
import { formatOrderCode, orderDayKey, paymentDeadline, transferContent } from "./order"
import { calculateShippingFee } from "./shipping"

describe("paymentDeadline", () => {
  const created = new Date("2026-11-17T03:00:00Z")
  it("VNPay 15 phút, chuyển khoản 24 giờ, COD không có hạn", () => {
    expect(paymentDeadline("VNPAY", created)?.toISOString()).toBe("2026-11-17T03:15:00.000Z")
    expect(paymentDeadline("BANK_TRANSFER", created)?.toISOString()).toBe("2026-11-18T03:00:00.000Z")
    expect(paymentDeadline("COD", created)).toBeNull()
  })
})

describe("paymentConfirmedMessage", () => {
  it("có mã đơn, và dòng tổng tiền khi có tóm tắt", () => {
    expect(paymentConfirmedMessage("FS-1").title).toContain("FS-1")
    expect(paymentConfirmedMessage("FS-1", { total: 100_000, itemCount: 2 }).body).toContain("2 sản phẩm")
  })
})

describe("calculateShippingFee", () => {
  it("đồng giá 30.000đ dưới 500.000đ, miễn phí từ 500.000đ", () => {
    expect(calculateShippingFee(499_999)).toBe(30_000)
    expect(calculateShippingFee(500_000)).toBe(0)
    expect(calculateShippingFee(4_300_000)).toBe(0)
  })

  it("giỏ rỗng không mất phí", () => {
    expect(calculateShippingFee(0)).toBe(0)
  })
})

describe("mã đơn", () => {
  it("định dạng FS-YYYYMMDD-NNNN, đệm 4 chữ số", () => {
    expect(formatOrderCode("20261109", 1)).toBe("FS-20261109-0001")
    expect(formatOrderCode("20261109", 123)).toBe("FS-20261109-0123")
    expect(formatOrderCode("20261109", 12345)).toBe("FS-20261109-12345")
  })

  it("ngày tính theo giờ Việt Nam (UTC+7), không theo UTC", () => {
    // 20:00 UTC ngày 9 = 03:00 ngày 10 giờ Việt Nam
    expect(orderDayKey(new Date("2026-11-09T20:00:00Z"))).toBe("20261110")
    expect(orderDayKey(new Date("2026-11-09T10:00:00Z"))).toBe("20261109")
  })

  it("nội dung chuyển khoản bỏ dấu gạch", () => {
    expect(transferContent("FS-20261109-0001")).toBe("FS202611090001")
  })
})
