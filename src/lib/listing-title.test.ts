import { describe, expect, it } from "vitest"
import { listingTitle } from "./listing-title"
import { parseProductFilters } from "./validators/product-filter"

const title = (qs: string) => listingTitle(parseProductFilters(new URLSearchParams(qs)))

describe("listingTitle", () => {
  it("không bộ lọc: Tất cả sản phẩm", () => expect(title("")).toBe("Tất cả sản phẩm"))
  it("featured=1: Sản phẩm nổi bật", () => expect(title("featured=1")).toBe("Sản phẩm nổi bật"))
  it("mùa thu + đông: Bộ sưu tập Thu Đông (thứ tự tuỳ ý)", () => {
    expect(title("season=thu&season=đông")).toBe("Bộ sưu tập Thu Đông")
    expect(title("season=đông,thu")).toBe("Bộ sưu tập Thu Đông")
  })
  it("chỉ một mùa hoặc mùa khác thì giữ tiêu đề chung", () => {
    expect(title("season=thu")).toBe("Tất cả sản phẩm")
    expect(title("season=xuân&season=hè")).toBe("Tất cả sản phẩm")
  })
  it("từ khoá luôn được ưu tiên", () => expect(title("q=áo&featured=1")).toBe("Kết quả cho “áo”"))
  it("featured sai giá trị thì bỏ qua", () => expect(title("featured=abc")).toBe("Tất cả sản phẩm"))
})
