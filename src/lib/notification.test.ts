import { describe, expect, it } from "vitest"
import { formatRelativeTime, orderStatusMessage } from "./notification"

describe("orderStatusMessage", () => {
  it("có thông báo cho mọi trạng thái; tiêu đề chứa mã đơn", () => {
    for (const to of ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"] as const) {
      const m = orderStatusMessage("FS-20261117-0001", to)
      expect(m?.title).toContain("FS-20261117-0001")
      expect(m?.body.length).toBeGreaterThan(0)
    }
  })

  it("PENDING là lời xác nhận đặt hàng thành công", () => {
    expect(orderStatusMessage("FS-1", "PENDING")?.title).toContain("Đặt hàng thành công")
  })

  it("có summary thì nội dung kèm tổng tiền và số sản phẩm; không có thì không", () => {
    const withSummary = orderStatusMessage("FS-1", "CONFIRMED", { total: 1_297_000, itemCount: 3 })
    expect(withSummary?.body).toMatch(/1\.297\.000/)
    expect(withSummary?.body).toContain("3 sản phẩm")
    expect(orderStatusMessage("FS-1", "CONFIRMED")?.body).not.toContain("sản phẩm).")
  })
})

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-17T12:00:00Z")
  const ago = (ms: number) => new Date(now.getTime() - ms)

  it.each([
    [10_000, "Vừa xong"],
    [5 * 60_000, "5 phút trước"],
    [3 * 3_600_000, "3 giờ trước"],
    [30 * 3_600_000, "Hôm qua"],
    [3 * 86_400_000, "3 ngày trước"],
  ])("%d ms trước → %s", (ms, expected) => {
    expect(formatRelativeTime(ago(ms), now)).toBe(expected)
  })

  it("quá 7 ngày hiện ngày; nhận cả chuỗi ISO; thời gian tương lai coi là vừa xong", () => {
    expect(formatRelativeTime(ago(10 * 86_400_000), now)).toMatch(/\d{1,2}\/\d{1,2}\/2026/)
    expect(formatRelativeTime(ago(2 * 60_000).toISOString(), now)).toBe("2 phút trước")
    expect(formatRelativeTime(new Date(now.getTime() + 60_000), now)).toBe("Vừa xong")
  })
})
