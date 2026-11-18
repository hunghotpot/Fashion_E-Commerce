import { describe, expect, it } from "vitest"
import { maskReviewerName, roundAverage } from "./review"

describe("maskReviewerName", () => {
  it("giữ tên gọi, rút các từ còn lại thành chữ cái đầu", () => {
    expect(maskReviewerName("Nguyễn Văn An")).toBe("N. V. An")
    expect(maskReviewerName("Trần Đặng Phi Hùng")).toBe("T. Đ. P. Hùng")
  })
  it("một từ giữ nguyên, khoảng trắng thừa được bỏ, rỗng thì ghi Khách hàng", () => {
    expect(maskReviewerName("An")).toBe("An")
    expect(maskReviewerName("  lê   thị  hoa ")).toBe("L. T. hoa")
    expect(maskReviewerName("   ")).toBe("Khách hàng")
  })
})

describe("roundAverage", () => {
  it("làm tròn 1 chữ số, 0 khi chưa có đánh giá", () => {
    expect(roundAverage(14, 3)).toBe(4.7)
    expect(roundAverage(10, 2)).toBe(5)
    expect(roundAverage(0, 0)).toBe(0)
  })
})
