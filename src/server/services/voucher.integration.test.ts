import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { FLAT_SHIPPING_FEE } from "@/lib/shipping"
import type { VoucherInput } from "@/lib/validators/admin-voucher"
import { AdminCatalogError } from "./admin-catalog.service"
import { createVoucher, deleteVoucher, listVouchers, setVoucherActive, updateVoucher } from "./admin-voucher.service"
import { cancelOrder, changeOrderStatus, createOrder } from "./order.service"
import { listAvailableVouchers, previewVoucher, VoucherError } from "./voucher.service"

/*
 * Test tích hợp voucher trên DB test riêng: áp mã khi đặt đơn (tính tiền, lượt dùng, hoàn lượt khi huỷ) và quản lý của Admin.
 */
const fx = createFixtures()
const PREFIX = `T${Date.now().toString(36).toUpperCase()}`
let seq = 0
const code = (s: string) => `${PREFIX}${s}${++seq}`
const extraCategories: string[] = []

afterAll(async () => {
  await db.voucher.deleteMany({ where: { code: { startsWith: PREFIX } } })
  await fx.cleanup()
  // fx.cleanup đã ngắt kết nối; mở lại bằng truy vấn đầu tiên bên dưới.
  await db.category.deleteMany({ where: { id: { in: extraCategories } } })
  await db.$disconnect()
})

const baseVoucher: VoucherInput = {
  code: "",
  name: "Voucher thử",
  type: "CASH",
  value: 20_000,
  maxDiscount: null,
  minOrder: 0,
  categoryId: null,
  firstOrderOnly: false,
  usageLimit: null,
  startsAt: "",
  expiresAt: "",
  isActive: true,
}

async function makeVoucher(extra: Partial<VoucherInput> = {}, adminId?: string) {
  const admin = adminId ?? (await fx.makeAdmin()).id
  return createVoucher({ userId: admin }, { ...baseVoucher, code: code("V"), ...extra })
}

async function buyer(price = 100_000, quantity = 2) {
  const v = await fx.makeVariant(10, price)
  const b = await fx.makeBuyer([{ variantId: v.id, quantity }])
  return { v, ...b }
}

const place = (b: Awaited<ReturnType<typeof buyer>>, voucherCode?: string | string[], paymentMethod: "COD" | "BANK_TRANSFER" = "COD") =>
  createOrder(b.user, { addressId: b.addressId, paymentMethod, voucherCodes: voucherCode === undefined ? undefined : [voucherCode].flat() })

describe("đặt đơn có voucher", () => {
  it("CASH: trừ vào tiền hàng, ghi discount + mã, tăng lượt dùng, tạo redemption", async () => {
    const vc = await makeVoucher({ value: 30_000 })
    const b = await buyer() // 200.000 ₫, freeship
    const order = await place(b, vc.code.toLowerCase()) // mã không phân biệt hoa thường
    expect(order.subtotal).toBe(200_000)
    expect(order.discount).toBe(30_000)
    expect(order.voucherCode).toBe(vc.code)
    expect(order.total).toBe(order.subtotal + order.shippingFee - 30_000)
    expect((await db.voucher.findUniqueOrThrow({ where: { id: vc.id } })).usedCount).toBe(1)
    expect(await db.voucherRedemption.count({ where: { voucherId: vc.id, userId: b.user.id } })).toBe(1)
  })

  it("PERCENT: tính theo % và bị chặn bởi mức giảm tối đa", async () => {
    const vc = await makeVoucher({ type: "PERCENT", value: 50, maxDiscount: 15_000 })
    const b = await buyer()
    const order = await place(b, vc.code)
    expect(order.discount).toBe(15_000)
  })

  it("FREESHIP: chỉ trừ phần phí vận chuyển", async () => {
    const vc = await makeVoucher({ type: "FREESHIP", value: 100_000 })
    const b = await buyer(100_000, 1) // 100.000 < ngưỡng freeship → có phí ship
    const order = await place(b, vc.code)
    expect(order.shippingFee).toBe(FLAT_SHIPPING_FEE)
    expect(order.discount).toBe(0) // mã vận chuyển không đụng tiền hàng
    expect(order.shippingDiscount).toBe(FLAT_SHIPPING_FEE)
    expect(order.shippingVoucherCode).toBe(vc.code)
    expect(order.voucherCode).toBeNull()
    expect(order.total).toBe(order.subtotal)
  })

  it("dùng CÙNG LÚC một mã giảm giá và một mã vận chuyển: hai khoản giảm riêng, hai redemption", async () => {
    const product = await makeVoucher({ value: 20_000 })
    const ship = await makeVoucher({ type: "FREESHIP", value: 30_000 })
    const b = await buyer(100_000, 1) // 100.000 ₫ + phí ship 30.000 ₫
    const order = await place(b, [product.code, ship.code])
    expect(order).toMatchObject({ discount: 20_000, voucherCode: product.code, shippingDiscount: FLAT_SHIPPING_FEE, shippingVoucherCode: ship.code })
    expect(order.total).toBe(100_000 + FLAT_SHIPPING_FEE - 20_000 - FLAT_SHIPPING_FEE)
    expect(await db.voucherRedemption.count({ where: { orderId: order.id } })).toBe(2)
    expect((await db.voucher.findUniqueOrThrow({ where: { id: product.id } })).usedCount).toBe(1)
    expect((await db.voucher.findUniqueOrThrow({ where: { id: ship.id } })).usedCount).toBe(1)
  })

  it("hai mã cùng nhóm không dùng chung được: đơn không được tạo, không trừ kho", async () => {
    const a = await makeVoucher({ value: 10_000 })
    const c = await makeVoucher({ type: "PERCENT", value: 10 })
    const s1 = await makeVoucher({ type: "FREESHIP", value: 30_000 })
    const s2 = await makeVoucher({ type: "FREESHIP", value: 20_000 })
    const b = await buyer(100_000, 1)
    await expect(place(b, [a.code, c.code])).rejects.toMatchObject({ code: "SLOT_CONFLICT" })
    await expect(place(b, [s1.code, s2.code])).rejects.toMatchObject({ code: "SLOT_CONFLICT" })
    await expect(place(b, [a.code, a.code])).resolves.toMatchObject({ voucherCode: a.code }) // cùng một mã lặp lại chỉ tính một lần
    expect(await fx.stockOf(b.v.id)).toBe(9)
  })

  it("huỷ đơn hoàn lượt của cả hai mã", async () => {
    const product = await makeVoucher({ value: 10_000, usageLimit: 1 })
    const ship = await makeVoucher({ type: "FREESHIP", value: 30_000, usageLimit: 1 })
    const b = await buyer(100_000, 1)
    const order = await place(b, [product.code, ship.code])
    await cancelOrder(b.user, order.id)
    expect((await db.voucher.findUniqueOrThrow({ where: { id: product.id } })).usedCount).toBe(0)
    expect((await db.voucher.findUniqueOrThrow({ where: { id: ship.id } })).usedCount).toBe(0)
    expect(await db.voucherRedemption.count({ where: { orderId: order.id } })).toBe(0)
  })

  it("mã vận chuyển khi đơn đã miễn phí ship thì bị từ chối", async () => {
    const ship = await makeVoucher({ type: "FREESHIP", value: 30_000 })
    const b = await buyer(300_000, 2) // 600.000 ₫ ≥ ngưỡng freeship
    await expect(place(b, ship.code)).rejects.toMatchObject({ code: "NO_ELIGIBLE_ITEMS" })
  })

  it("không dùng mã: discount 0, mã rỗng", async () => {
    const order = await place(await buyer())
    expect(order.discount).toBe(0)
    expect(order.voucherCode).toBeNull()
  })

  it("mỗi khách một lần; sai điều kiện thì không tạo đơn, không trừ kho, không mất giỏ", async () => {
    const vc = await makeVoucher()
    const b = await buyer()
    await place(b, vc.code)
    // Giỏ mới cho cùng khách
    await db.cart.update({ where: { userId: b.user.id }, data: { items: { create: { variantId: b.v.id, quantity: 1 } } } })
    const stockBefore = await fx.stockOf(b.v.id)
    await expect(place(b, vc.code)).rejects.toMatchObject({ code: "ALREADY_USED" })
    expect(await fx.stockOf(b.v.id)).toBe(stockBefore)
    expect(await fx.cartSize(b.user.id)).toBe(1)
  })

  it("hết lượt: khách thứ hai bị từ chối, usedCount không vượt hạn mức", async () => {
    const vc = await makeVoucher({ usageLimit: 1 })
    await place(await buyer(), vc.code)
    await expect(place(await buyer(), vc.code)).rejects.toMatchObject({ code: "EXHAUSTED" })
    expect((await db.voucher.findUniqueOrThrow({ where: { id: vc.id } })).usedCount).toBe(1)
  })

  it("hai đơn cùng lúc tranh lượt cuối: chỉ một đơn thành công", async () => {
    const vc = await makeVoucher({ usageLimit: 1 })
    const [a, c] = [await buyer(), await buyer()]
    const results = await Promise.allSettled([place(a, vc.code), place(c, vc.code)])
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect((await db.voucher.findUniqueOrThrow({ where: { id: vc.id } })).usedCount).toBe(1)
  })

  it("huỷ đơn hoàn lượt dùng và cho khách dùng lại mã", async () => {
    const vc = await makeVoucher({ usageLimit: 1 })
    const b = await buyer()
    const order = await place(b, vc.code)
    await cancelOrder(b.user, order.id, "Đổi ý")
    expect((await db.voucher.findUniqueOrThrow({ where: { id: vc.id } })).usedCount).toBe(0)
    expect(await db.voucherRedemption.count({ where: { voucherId: vc.id } })).toBe(0)
    await db.cart.update({ where: { userId: b.user.id }, data: { items: { create: { variantId: b.v.id, quantity: 1 } } } })
    const again = await place(b, vc.code)
    expect(again.voucherCode).toBe(vc.code)
  })

  it.each([
    ["không tồn tại", () => "KHONGCO" + PREFIX, "NOT_FOUND"],
  ])("mã %s bị từ chối", async (_n, getCode, expected) => {
    await expect(place(await buyer(), getCode())).rejects.toMatchObject({ code: expected })
  })

  it("đã tắt / hết hạn / chưa bắt đầu / dưới đơn tối thiểu", async () => {
    const day = 24 * 3600_000
    const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
    const off = await makeVoucher({ isActive: false })
    const expired = await makeVoucher({ expiresAt: iso(Date.now() - 3 * day) })
    const future = await makeVoucher({ startsAt: iso(Date.now() + 5 * day) })
    const min = await makeVoucher({ minOrder: 1_000_000 })
    await expect(place(await buyer(), off.code)).rejects.toMatchObject({ code: "INACTIVE" })
    await expect(place(await buyer(), expired.code)).rejects.toMatchObject({ code: "EXPIRED" })
    await expect(place(await buyer(), future.code)).rejects.toMatchObject({ code: "NOT_STARTED" })
    await expect(place(await buyer(), min.code)).rejects.toMatchObject({ code: "MIN_ORDER" })
  })

  it("đặt đơn chuyển khoản với voucher: tổng tiền (số tiền QR) là tổng sau giảm", async () => {
    const vc = await makeVoucher({ value: 30_000 })
    const order = await place(await buyer(), vc.code, "BANK_TRANSFER")
    expect(order).toMatchObject({ discount: 30_000, voucherCode: vc.code, paymentMethod: "BANK_TRANSFER" })
    expect(order.total).toBe(order.subtotal + order.shippingFee - 30_000)
  })

  it("giới hạn danh mục: sai danh mục bị từ chối, đúng danh mục chỉ giảm trên phần hàng thuộc danh mục", async () => {
    const other = await db.category.create({ data: { name: `Khác ${PREFIX}`, slug: `khac-${PREFIX}-${++seq}`.toLowerCase() } })
    extraCategories.push(other.id)
    const b = await buyer()
    const productCategory = (await db.product.findUniqueOrThrow({ where: { id: b.v.productId }, select: { categoryId: true } })).categoryId

    const wrong = await makeVoucher({ categoryId: other.id })
    await expect(place(b, wrong.code)).rejects.toMatchObject({ code: "NO_ELIGIBLE_ITEMS" })

    const right = await makeVoucher({ categoryId: productCategory, type: "PERCENT", value: 10, maxDiscount: null })
    const order = await place(b, right.code)
    expect(order.discount).toBe(20_000) // 10% của 200.000
    // Danh mục đang được voucher dùng thì không xoá được
    await expect(db.category.delete({ where: { id: productCategory } })).rejects.toBeTruthy()
  })

  it("chỉ đơn đầu tiên: khách đã có đơn (chưa huỷ) bị từ chối, đơn đã huỷ không tính", async () => {
    const vc = await makeVoucher({ firstOrderOnly: true })
    const b = await buyer()
    const first = await place(b)
    await db.cart.update({ where: { userId: b.user.id }, data: { items: { create: { variantId: b.v.id, quantity: 1 } } } })
    await expect(place(b, vc.code)).rejects.toMatchObject({ code: "FIRST_ORDER_ONLY" })
    await cancelOrder(b.user, first.id)
    expect((await place(b, vc.code)).voucherCode).toBe(vc.code)
  })

  it("email xác nhận và đổi trạng thái không làm đổi số tiền đã giảm", async () => {
    const vc = await makeVoucher({ value: 10_000 })
    const b = await buyer()
    const order = await place(b, vc.code)
    const admin = await fx.makeAdmin()
    await changeOrderStatus(order.id, "CONFIRMED", { type: "ADMIN", userId: admin.id })
    const row = await db.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(row.discount).toBe(10_000)
    expect(row.total).toBe(order.total)
  })
})

describe("xem trước voucher", () => {
  it("trả mức giảm cho giỏ hiện tại; lỗi là VoucherError", async () => {
    const vc = await makeVoucher({ value: 25_000 })
    const b = await buyer()
    const preview = await previewVoucher(b.user, { code: ` ${vc.code.toLowerCase()} ` })
    expect(preview).toMatchObject({ code: vc.code, discount: 25_000 })
    await expect(previewVoucher(b.user, { code: "KHONGCO" })).rejects.toBeInstanceOf(VoucherError)
  })
})

describe("Admin quản lý voucher", () => {
  it("tạo (mã chuẩn hoá IN HOA), trùng mã bị chặn, sửa, tắt/bật, liệt kê và lọc", async () => {
    const admin = await fx.makeAdmin()
    const c = code("A")
    const created = await createVoucher({ userId: admin.id }, { ...baseVoucher, code: ` ${c.toLowerCase()} ` })
    expect(created.code).toBe(c)
    await expect(createVoucher({ userId: admin.id }, { ...baseVoucher, code: c })).rejects.toMatchObject({ code: "VOUCHER_DUPLICATE_CODE" })

    const updated = await updateVoucher({ userId: admin.id }, created.id, { ...baseVoucher, code: c, name: "Tên mới", value: 5_000 })
    expect(updated).toMatchObject({ name: "Tên mới", value: 5_000 })

    await setVoucherActive({ userId: admin.id }, created.id, false)
    const disabled = await listVouchers({ q: c, status: "disabled" })
    expect(disabled.rows.map((r) => r.code)).toEqual([c])
    expect(disabled.rows[0].status).toBe("DISABLED")
    expect((await listVouchers({ q: c, status: "active" })).rows).toHaveLength(0)
  })

  it("dữ liệu sai bị từ chối: % quá 100, hết hạn trước ngày bắt đầu, mã ngắn", async () => {
    const admin = { userId: (await fx.makeAdmin()).id }
    await expect(createVoucher(admin, { ...baseVoucher, code: code("B"), type: "PERCENT", value: 120 })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(createVoucher(admin, { ...baseVoucher, code: code("C"), startsAt: "2026-12-10", expiresAt: "2026-12-01" })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(createVoucher(admin, { ...baseVoucher, code: "AB" })).rejects.toBeInstanceOf(AdminCatalogError)
  })

  it("không đặt hạn mức nhỏ hơn số lượt đã dùng; voucher đã có đơn dùng thì không xoá, chưa dùng thì xoá được", async () => {
    const admin = { userId: (await fx.makeAdmin()).id }
    const used = await makeVoucher({}, admin.userId)
    await place(await buyer(), used.code)
    await expect(updateVoucher(admin, used.id, { ...baseVoucher, code: used.code, usageLimit: 1 })).resolves.toBeTruthy()
    // đã dùng 1 lượt nên hạn mức 1 là hợp lệ, 0 thì schema chặn
    await expect(updateVoucher(admin, used.id, { ...baseVoucher, code: used.code, usageLimit: 0 })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(deleteVoucher(admin, used.id)).rejects.toMatchObject({ code: "VOUCHER_IN_USE" })

    const fresh = await makeVoucher({}, admin.userId)
    await deleteVoucher(admin, fresh.id)
    expect(await db.voucher.findUnique({ where: { id: fresh.id } })).toBeNull()
  })

  it("thống kê tính theo đơn chưa huỷ", async () => {
    const vc = await makeVoucher({ value: 10_000 })
    const b = await buyer()
    const order = await place(b, vc.code)
    const before = (await listVouchers({})).stats
    await cancelOrder(b.user, order.id)
    const after = (await listVouchers({})).stats
    expect(before.discountTotal - after.discountTotal).toBe(10_000)
  })
})

describe("voucher dành cho bạn (dưới ô nhập mã)", () => {
  // Danh sách giới hạn 20 voucher và bảng dùng chung với các test trước: dọn voucher của file này để mỗi test đo đúng phần mình tạo.
  beforeEach(async () => {
    await db.voucher.deleteMany({ where: { code: { startsWith: PREFIX } } })
  })
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

  it("liệt kê voucher đang chạy: dùng được xếp trước (giảm nhiều lên đầu, gắn Tiết kiệm nhất), chưa dùng được kèm lý do", async () => {
    const small = await makeVoucher({ value: 10_000 })
    const big = await makeVoucher({ value: 40_000 })
    const tooHigh = await makeVoucher({ minOrder: 5_000_000 })
    const b = await buyer() // 200.000 ₫
    const list = await listAvailableVouchers(b.user, {})
    const find = (c: string) => list.find((v) => v.code === c)

    expect(find(big.code)).toMatchObject({ eligible: true, slot: "PRODUCT", discount: 40_000, best: true, stub: "40K" })
    expect(find(small.code)).toMatchObject({ eligible: true, discount: 10_000 })
    expect(find(small.code)?.best).toBeUndefined()
    expect(find(tooHigh.code)).toMatchObject({ eligible: false, discount: 0 })
    expect(find(tooHigh.code)?.reason).toContain("5.000.000")
    // dùng được xếp trước chưa dùng được, và giảm nhiều đứng trước giảm ít
    expect(list.findIndex((v) => v.code === big.code)).toBeLessThan(list.findIndex((v) => v.code === small.code))
    expect(list.findIndex((v) => v.code === small.code)).toBeLessThan(list.findIndex((v) => v.code === tooHigh.code))
  })

  it("không liệt kê: đã dùng, đã tắt, hết hạn, chưa bắt đầu, hết lượt, chỉ đơn đầu mà khách đã có đơn", async () => {
    const used = await makeVoucher()
    const off = await makeVoucher({ isActive: false })
    const expired = await makeVoucher({ expiresAt: iso(Date.now() - 3 * 24 * 3600_000) })
    const future = await makeVoucher({ startsAt: iso(Date.now() + 5 * 24 * 3600_000) })
    const full = await makeVoucher({ usageLimit: 1 })
    const first = await makeVoucher({ firstOrderOnly: true })
    await place(await buyer(), full.code) // làm hết lượt voucher `full`
    const b = await buyer()
    await place(b, used.code) // khách này đã dùng `used`
    await db.cart.update({ where: { userId: b.user.id }, data: { items: { create: { variantId: b.v.id, quantity: 1 } } } })

    const codes = (await listAvailableVouchers(b.user, {})).map((v) => v.code)
    for (const v of [used, off, expired, future, full, first]) expect(codes).not.toContain(v.code)
  })

  it("theo phương thức thanh toán: COD và chuyển khoản đều dùng được", async () => {
    const vc = await makeVoucher()
    const b = await buyer()
    const cod = (await listAvailableVouchers(b.user, { paymentMethod: "COD" })).find((v) => v.code === vc.code)
    const bank = (await listAvailableVouchers(b.user, { paymentMethod: "BANK_TRANSFER" })).find((v) => v.code === vc.code)
    expect(cod?.eligible).toBe(true)
    expect(bank?.eligible).toBe(true)
  })

  it("theo phần hàng được chọn: voucher giới hạn danh mục chỉ dùng được khi phần chọn thuộc danh mục", async () => {
    const other = await db.category.create({ data: { name: `Lọc ${PREFIX}`, slug: `loc-${PREFIX}-${++seq}`.toLowerCase() } })
    extraCategories.push(other.id)
    const vc = await makeVoucher({ categoryId: other.id })
    const b = await buyer()
    const item = (await listAvailableVouchers(b.user, { source: { items: [b.v.id] } })).find((v) => v.code === vc.code)
    expect(item).toMatchObject({ eligible: false })
  })

  it("giỏ trống thì không có voucher nào", async () => {
    const empty = await fx.makeBuyer([])
    expect(await listAvailableVouchers(empty.user, {})).toEqual([])
  })
})

describe("voucher vận chuyển tách nhóm riêng", () => {
  // Danh sách giới hạn 20 voucher và bảng dùng chung với các test trước: dọn voucher của file này để mỗi test đo đúng phần mình tạo.
  beforeEach(async () => {
    await db.voucher.deleteMany({ where: { code: { startsWith: PREFIX } } })
  })
  it("danh sách phân nhóm PRODUCT/SHIPPING, 'Tiết kiệm nhất' tính riêng từng nhóm; xem trước trả đúng nhóm", async () => {
    const p1 = await makeVoucher({ value: 5_000 })
    const p2 = await makeVoucher({ value: 25_000 })
    const s1 = await makeVoucher({ type: "FREESHIP", value: 10_000 })
    const s2 = await makeVoucher({ type: "FREESHIP", value: 30_000 })
    const b = await buyer(100_000, 1)
    const list = await listAvailableVouchers(b.user, {})
    const find = (c: string) => list.find((v) => v.code === c)
    expect(find(s1.code)).toMatchObject({ slot: "SHIPPING", eligible: true, discount: 10_000 })
    expect(find(s2.code)).toMatchObject({ slot: "SHIPPING", eligible: true, discount: 30_000, best: true })
    expect(find(s1.code)?.best).toBeUndefined()
    expect(find(p2.code)).toMatchObject({ slot: "PRODUCT", best: true })
    expect(find(p1.code)?.best).toBeUndefined()
    expect((await previewVoucher(b.user, { code: s2.code })).slot).toBe("SHIPPING")
    expect((await previewVoucher(b.user, { code: p2.code })).slot).toBe("PRODUCT")
  })

  it("mã vận chuyển báo lý do khi đơn đã freeship", async () => {
    const ship = await makeVoucher({ type: "FREESHIP", value: 30_000 })
    const b = await buyer(300_000, 2)
    const item = (await listAvailableVouchers(b.user, {})).find((v) => v.code === ship.code)
    expect(item).toMatchObject({ eligible: false })
    expect(item?.reason).toContain("miễn phí vận chuyển")
  })
})
