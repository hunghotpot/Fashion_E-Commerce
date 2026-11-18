import { describe, expect, it } from "vitest"
import { addressSchema } from "@/lib/validators/auth"
import { findProvince, isPlausibleStreet, PROVINCES } from "./vn-address"

describe("danh sách tỉnh/thành", () => {
  it("có đủ 34 tỉnh/thành sau sáp nhập, tên duy nhất, không còn cấp quận/huyện", () => {
    expect(PROVINCES).toHaveLength(34)
    expect(new Set(PROVINCES.map((p) => p.name)).size).toBe(34)
    expect(findProvince("Thành phố Hồ Chí Minh")).toBeDefined()
    expect(findProvince("Thành phố Hà Nội")).toBeDefined()
    expect(findProvince("Bình Dương")).toBeUndefined() // đã sáp nhập vào TP. Hồ Chí Minh
  })
})

describe("isPlausibleStreet (chặn địa chỉ giả như ',.:')", () => {
  it.each(["12 Nguyễn Huệ", "Hẻm 45/3 Lê Lợi", "Số 5, ngõ 12 Trần Duy Hưng", "Tòa A1 (tầng 3) - KĐT Sala", "88 O'Brien #2"])("chấp nhận %s", (v) => {
    expect(isPlausibleStreet(v)).toBe(true)
  })
  it.each([",.:", ", , ,", "...", "12345", "1/2/3", "ab", "<script>alert(1)</script>", "Đường; DROP TABLE"])("từ chối %s", (v) => {
    expect(isPlausibleStreet(v)).toBe(false)
  })
})

describe("addressSchema", () => {
  const ok = { fullName: "Nguyễn Minh Anh", phone: "0987654321", street: "12 Nguyễn Huệ", ward: "Phường Sài Gòn", province: "Thành phố Hồ Chí Minh", isDefault: false }
  it("không còn trường quận/huyện; đủ thông tin thì hợp lệ", () => {
    const r = addressSchema.safeParse(ok)
    expect(r.success).toBe(true)
    expect(r.success && "district" in r.data).toBe(false)
  })
  it("tên đường toàn dấu câu bị từ chối với thông báo ở ô street", () => {
    const r = addressSchema.safeParse({ ...ok, street: ",.:" })
    expect(r.success).toBe(false)
    expect(r.success ? "" : r.error.issues[0].path[0]).toBe("street")
  })
  it("thiếu phường hoặc tỉnh bị từ chối", () => {
    expect(addressSchema.safeParse({ ...ok, ward: "" }).success).toBe(false)
    expect(addressSchema.safeParse({ ...ok, province: "" }).success).toBe(false)
  })
})
