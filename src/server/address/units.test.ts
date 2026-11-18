import { describe, expect, it } from "vitest"
import { PROVINCES } from "@/lib/vn-address"
import { isValidWard, listWards, validateAddressUnits } from "./units"

describe("phường/xã theo tỉnh", () => {
  it("mỗi tỉnh/thành đều có phường/xã; tổng 3.321 đơn vị", () => {
    let total = 0
    for (const p of PROVINCES) {
      const wards = listWards(p.name)
      expect(wards.length).toBeGreaterThan(0)
      total += wards.length
    }
    expect(total).toBe(3321)
  })

  it("kiểm phường thuộc đúng tỉnh", () => {
    expect(isValidWard("Thành phố Hồ Chí Minh", "Phường Sài Gòn")).toBe(true)
    expect(isValidWard("Thành phố Hà Nội", "Phường Sài Gòn")).toBe(false) // phường của tỉnh khác
    expect(isValidWard("Thành phố Hồ Chí Minh", "Phường Bến Nghé")).toBe(false) // tên cũ trước sáp nhập
    expect(isValidWard("Không có tỉnh này", "Phường Sài Gòn")).toBe(false)
  })

  it("validateAddressUnits trả lỗi đúng ô", () => {
    expect(validateAddressUnits({ province: "Thành phố Hồ Chí Minh", ward: "Phường Sài Gòn" })).toBeNull()
    expect(validateAddressUnits({ province: "Abc", ward: "Phường Sài Gòn" })).toHaveProperty("province")
    expect(validateAddressUnits({ province: "Thành phố Hà Nội", ward: "Phường Sài Gòn" })).toHaveProperty("ward")
  })
})
