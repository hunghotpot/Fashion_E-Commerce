import { afterAll, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { db } from "@/server/db"
import { createFixtures } from "@/test/db-fixtures"
import { getBuyNowCart } from "./cart.service"
import { createOrder } from "./order.service"
import { previewVoucher } from "./voucher.service"

/*
 * Thanh toán từng món trong giỏ và Mua ngay: chỉ mua đúng phần được chọn, phần còn lại / giỏ thật không bị đụng.
 */
const fx = createFixtures()
const vouchers: string[] = []
afterAll(async () => {
  await db.voucher.deleteMany({ where: { code: { in: vouchers } } })
  await fx.cleanup()
})

async function twoLineBuyer() {
  const a = await fx.makeVariant(10, 100_000)
  const b = await fx.makeVariant(10, 250_000)
  const buyer = await fx.makeBuyer([
    { variantId: a.id, quantity: 2 },
    { variantId: b.id, quantity: 1 },
  ])
  return { a, b, ...buyer }
}

describe("thanh toán các dòng giỏ được chọn", () => {
  it("chỉ tính tiền, trừ kho và xoá khỏi giỏ đúng dòng được chọn", async () => {
    const { a, b, user, addressId } = await twoLineBuyer()
    const order = await createOrder(user, { addressId, paymentMethod: "COD", source: { items: [a.id] } })
    expect(order.subtotal).toBe(200_000) // chỉ dòng a: 2 × 100.000
    expect(order.items).toHaveLength(1)
    expect(await fx.stockOf(a.id)).toBe(8)
    expect(await fx.stockOf(b.id)).toBe(10) // dòng b không bị trừ kho
    const left = await db.cartItem.findMany({ where: { cart: { userId: user.id } } })
    expect(left.map((i) => i.variantId)).toEqual([b.id]) // b còn trong giỏ
  })

  it("không chọn gì (bỏ trống) vẫn là cả giỏ như trước", async () => {
    const { user, addressId } = await twoLineBuyer()
    const order = await createOrder(user, { addressId, paymentMethod: "COD" })
    expect(order.subtotal).toBe(450_000)
    expect(await fx.cartSize(user.id)).toBe(0)
  })

  it("chọn dòng không có trong giỏ thì từ chối, không đụng gì", async () => {
    const { a, user, addressId } = await twoLineBuyer()
    await expect(createOrder(user, { addressId, paymentMethod: "COD", source: { items: ["khong-co-trong-gio"] } })).rejects.toMatchObject({ code: "EMPTY_CART" })
    expect(await fx.stockOf(a.id)).toBe(10)
    expect(await fx.cartSize(user.id)).toBe(2)
  })

  it("phí ship tính trên phần được chọn, không phải cả giỏ", async () => {
    const big = await fx.makeVariant(10, 600_000)
    const small = await fx.makeVariant(10, 100_000)
    const buyer = await fx.makeBuyer([
      { variantId: big.id, quantity: 1 },
      { variantId: small.id, quantity: 1 },
    ])
    const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD", source: { items: [small.id] } })
    expect(order.shippingFee).toBe(30_000) // 100.000 < ngưỡng freeship dù cả giỏ vượt ngưỡng
  })

  it("voucher chỉ xem trước/áp trên phần được chọn", async () => {
    const { a, user, addressId } = await twoLineBuyer()
    const code = `SRC${Date.now().toString(36).toUpperCase()}`
    vouchers.push(code)
    await db.voucher.create({ data: { code, name: "Thử", type: "PERCENT", value: 10 } })
    expect((await previewVoucher(user, { code, source: { items: [a.id] } })).discount).toBe(20_000) // 10% của 200.000
    expect((await previewVoucher(user, { code })).discount).toBe(45_000) // 10% của cả giỏ 450.000
    const order = await createOrder(user, { addressId, paymentMethod: "COD", voucherCodes: [code], source: { items: [a.id] } })
    expect(order.discount).toBe(20_000)
  })
})

describe("Mua ngay", () => {
  it("đặt đơn chỉ với sản phẩm đó và KHÔNG đụng giỏ", async () => {
    const { a, b, user, addressId } = await twoLineBuyer()
    const order = await createOrder(user, { addressId, paymentMethod: "COD", source: { buyNow: { variantId: b.id, quantity: 3 } } })
    expect(order.subtotal).toBe(750_000)
    expect(order.items).toHaveLength(1)
    expect(await fx.stockOf(b.id)).toBe(7)
    expect(await fx.stockOf(a.id)).toBe(10)
    expect(await fx.cartSize(user.id)).toBe(2) // giỏ nguyên vẹn
  })

  it("không cần có giỏ; vượt tồn kho thì báo thiếu hàng và không tạo đơn", async () => {
    const v = await fx.makeVariant(2, 100_000)
    const buyer = await fx.makeBuyer([])
    await expect(createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD", source: { buyNow: { variantId: v.id, quantity: 5 } } })).rejects.toMatchObject({ code: "OUT_OF_STOCK" })
    expect(await fx.stockOf(v.id)).toBe(2)
    const ok = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD", source: { buyNow: { variantId: v.id, quantity: 2 } } })
    expect(ok.subtotal).toBe(200_000)
    expect(await fx.stockOf(v.id)).toBe(0)
  })

  it("biến thể không tồn tại bị từ chối", async () => {
    const buyer = await fx.makeBuyer([])
    await expect(createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD", source: { buyNow: { variantId: "khong-co", quantity: 1 } } })).rejects.toMatchObject({ code: "EMPTY_CART" })
  })

  it("getBuyNowCart dựng dòng hiển thị, không ghi giỏ; biến thể lạ trả null", async () => {
    const v = await fx.makeVariant(5, 120_000)
    const cart = await getBuyNowCart(v.id, 2)
    expect(cart?.subtotal).toBe(240_000)
    expect(cart?.items).toHaveLength(1)
    expect(await getBuyNowCart("khong-co", 1)).toBeNull()
  })
})
