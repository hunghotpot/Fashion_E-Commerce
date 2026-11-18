import { describe, expect, it } from "vitest"
import { orderSourceSchema, sourceFromQuery, sourceToQuery } from "./order-source"

describe("orderSourceSchema", () => {
  it("chấp nhận bỏ trống (cả giỏ), danh sách dòng chọn, hoặc mua ngay", () => {
    expect(orderSourceSchema.safeParse({}).success).toBe(true)
    expect(orderSourceSchema.safeParse({ items: ["a", "b"] }).success).toBe(true)
    expect(orderSourceSchema.safeParse({ buyNow: { variantId: "v1", quantity: 2 } }).success).toBe(true)
  })
  it("từ chối: danh sách rỗng, số lượng sai, vừa chọn dòng vừa mua ngay", () => {
    expect(orderSourceSchema.safeParse({ items: [] }).success).toBe(false)
    expect(orderSourceSchema.safeParse({ buyNow: { variantId: "v1", quantity: 0 } }).success).toBe(false)
    expect(orderSourceSchema.safeParse({ buyNow: { variantId: "v1", quantity: 100 } }).success).toBe(false)
    expect(orderSourceSchema.safeParse({ buyNow: { variantId: "v1", quantity: 1.5 } }).success).toBe(false)
    expect(orderSourceSchema.safeParse({ items: ["a"], buyNow: { variantId: "v1", quantity: 1 } }).success).toBe(false)
  })
})

describe("sourceToQuery / sourceFromQuery", () => {
  it("đi về nhau không đổi", () => {
    for (const s of [{ items: ["a", "b"] }, { buyNow: { variantId: "v1", quantity: 3 } }]) {
      const q = new URLSearchParams(sourceToQuery(s))
      expect(sourceFromQuery({ items: q.get("items") ?? undefined, buyNow: q.get("buyNow") ?? undefined, qty: q.get("qty") ?? undefined })).toEqual(s)
    }
    expect(sourceToQuery(undefined)).toBe("")
    expect(sourceFromQuery({})).toBeUndefined()
  })
  it("số lượng trên URL bị kẹp trong 1..99, sai thì về 1", () => {
    expect(sourceFromQuery({ buyNow: "v", qty: "500" })).toEqual({ buyNow: { variantId: "v", quantity: 99 } })
    expect(sourceFromQuery({ buyNow: "v", qty: "abc" })).toEqual({ buyNow: { variantId: "v", quantity: 1 } })
    expect(sourceFromQuery({ buyNow: "v", qty: "0" })).toEqual({ buyNow: { variantId: "v", quantity: 1 } })
  })
})
