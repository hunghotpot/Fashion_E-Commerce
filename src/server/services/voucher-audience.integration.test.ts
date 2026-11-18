import { afterAll, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { CUSTOMER_TIER_CONFIG } from "@/lib/customer-tier"
import { FLAT_SHIPPING_FEE } from "@/lib/shipping"
import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import type { VoucherInput } from "@/lib/validators/admin-voucher"
import { AdminCatalogError } from "./admin-catalog.service"
import { createVoucher, deleteVoucher, listVouchers, updateVoucher } from "./admin-voucher.service"
import { createOrder } from "./order.service"
import { listAvailableVouchers, listMyVouchers, previewVoucher, syncTierPerks, VoucherError } from "./voucher.service"

/*
 * Test tích hợp: voucher theo đối tượng (gán riêng, theo hạng), tự cấp voucher chào mừng khi lên hạng, ngưỡng miễn phí
 * vận chuyển theo hạng. Hạng tính từ đơn đã giao/đã thanh toán, nên test tạo đơn "đã giao" trực tiếp để có chi tiêu.
 */
const fx = createFixtures()
const PREFIX = `A${Date.now().toString(36).toUpperCase()}`
let seq = 0
const code = (s: string) => `${PREFIX}${s}${++seq}`

afterAll(async () => {
  await db.voucher.deleteMany({ where: { code: { startsWith: PREFIX } } })
  await fx.cleanup()
  await db.$disconnect()
})

async function buyer(price = 100_000, quantity = 2) {
  const v = await fx.makeVariant(10, price)
  const b = await fx.makeBuyer([{ variantId: v.id, quantity }])
  return { v, ...b }
}

/** Cho khách `amount` chi tiêu hợp lệ bằng một đơn COD đã giao. */
async function spend(userId: string, amount: number) {
  await db.order.create({
    data: {
      code: `T-${Date.now().toString(36)}-${++seq}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      status: "DELIVERED",
      paymentStatus: "PAID",
      subtotal: amount,
      shippingFee: 0,
      total: amount,
      shippingAddress: {},
      paymentMethod: "COD",
    },
  })
}

const voucher = (extra: Parameters<typeof db.voucher.create>[0]["data"] extends infer D ? Partial<D> : never = {}) =>
  db.voucher.create({
    data: { code: code("V"), name: "Voucher thử", type: "CASH", value: 20_000, ...extra } as Parameters<typeof db.voucher.create>[0]["data"],
  })

const reason = async (b: Awaited<ReturnType<typeof buyer>>, c: string) => {
  const list = await listAvailableVouchers(b.user, {})
  return list.find((v) => v.code === c)
}

describe("voucher gán riêng cho khách", () => {
  it("chỉ người được gán xem trước/áp được; người khác nhận 'không tồn tại' và không thấy trong danh sách", async () => {
    const vc = await voucher({ audience: "USERS" })
    const owner = await buyer()
    const other = await buyer()
    await db.voucherAssignment.create({ data: { voucherId: vc.id, userId: owner.user.id } })

    expect((await previewVoucher(owner.user, { code: vc.code })).discount).toBe(20_000)
    await expect(previewVoucher(other.user, { code: vc.code })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await reason(owner, vc.code))?.eligible).toBe(true)
    expect(await reason(other, vc.code)).toBeUndefined()
  })

  it("đặt đơn với mã chưa được gán thì lỗi và không tạo đơn", async () => {
    const vc = await voucher({ audience: "USERS" })
    const other = await buyer()
    await expect(createOrder(other.user, { addressId: other.addressId, paymentMethod: "COD", voucherCodes: [vc.code] })).rejects.toBeInstanceOf(VoucherError)
    expect(await db.order.count({ where: { userId: other.user.id } })).toBe(0)
  })
})

describe("voucher theo hạng", () => {
  it("chưa đủ hạng: bị từ chối với lý do hạng, vẫn hiện trong danh sách kèm lý do; đủ hạng thì dùng được", async () => {
    const vc = await voucher({ audience: "TIER", minTier: "GOLD" })
    const low = await buyer()
    await spend(low.user.id, CUSTOMER_TIER_CONFIG.SILVER.minSpend)
    await expect(previewVoucher(low.user, { code: vc.code })).rejects.toMatchObject({ code: "TIER_REQUIRED", message: expect.stringContaining("Vàng") })
    const entry = await reason(low, vc.code)
    expect(entry).toMatchObject({ eligible: false })
    expect(entry?.reason).toContain("Vàng")

    const high = await buyer()
    await spend(high.user.id, CUSTOMER_TIER_CONFIG.GOLD.minSpend)
    expect((await previewVoucher(high.user, { code: vc.code })).discount).toBe(20_000)
    expect((await reason(high, vc.code))?.eligible).toBe(true)
  })

  it("đơn chỉ vừa đặt (chưa thanh toán/giao) không nâng hạng để dùng mã theo hạng", async () => {
    const vc = await voucher({ audience: "TIER", minTier: "SILVER" })
    const b = await buyer()
    await db.order.create({
      data: {
        code: `T-${Date.now().toString(36)}-${++seq}-p`,
        userId: b.user.id,
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal: CUSTOMER_TIER_CONFIG.SILVER.minSpend,
        shippingFee: 0,
        total: CUSTOMER_TIER_CONFIG.SILVER.minSpend,
        shippingAddress: {},
        paymentMethod: "COD",
      },
    })
    await expect(previewVoucher(b.user, { code: vc.code })).rejects.toMatchObject({ code: "TIER_REQUIRED" })
  })
})

describe("tự cấp voucher chào mừng khi lên hạng", () => {
  it("gán khi đạt hạng, một lần duy nhất, kèm đúng một thông báo; chưa đạt hạng thì không gán", async () => {
    const welcome = await voucher({ audience: "USERS", welcomeTier: "SILVER" })
    const b = await buyer()

    expect((await syncTierPerks(b.user.id)).granted).not.toContain(welcome.code) // đang là Thành viên
    expect(await db.voucherAssignment.count({ where: { voucherId: welcome.id, userId: b.user.id } })).toBe(0)

    await spend(b.user.id, CUSTOMER_TIER_CONFIG.SILVER.minSpend)
    expect((await syncTierPerks(b.user.id)).granted).toContain(welcome.code)
    expect((await syncTierPerks(b.user.id)).granted).not.toContain(welcome.code) // lần hai: đã có rồi
    expect(await db.voucherAssignment.count({ where: { voucherId: welcome.id, userId: b.user.id } })).toBe(1)

    const notes = await db.notification.findMany({ where: { userId: b.user.id, type: "VOUCHER" } })
    expect(notes.filter((n) => n.title.includes(welcome.code))).toHaveLength(1)
    expect(notes[0].href).toBe("/account/vouchers")
    expect((await previewVoucher(b.user, { code: welcome.code })).discount).toBe(20_000) // dùng được ngay
  })

  it("chạy đồng thời vẫn chỉ gán và báo một lần; voucher đã tắt/hết hạn không được cấp", async () => {
    const welcome = await voucher({ audience: "USERS", welcomeTier: "MEMBER" })
    const off = await voucher({ audience: "USERS", welcomeTier: "MEMBER", isActive: false })
    const expired = await voucher({ audience: "USERS", welcomeTier: "MEMBER", expiresAt: new Date(Date.now() - 86_400_000) })
    const b = await buyer()

    await Promise.all([syncTierPerks(b.user.id), syncTierPerks(b.user.id), syncTierPerks(b.user.id)])
    expect(await db.voucherAssignment.count({ where: { voucherId: welcome.id, userId: b.user.id } })).toBe(1)
    expect((await db.notification.findMany({ where: { userId: b.user.id, type: "VOUCHER" } })).filter((n) => n.title.includes(welcome.code))).toHaveLength(1)
    expect(await db.voucherAssignment.count({ where: { voucherId: { in: [off.id, expired.id] }, userId: b.user.id } })).toBe(0)
  })

  it("mở danh sách 'dành cho bạn' cũng tự cấp (cấp lười)", async () => {
    const welcome = await voucher({ audience: "USERS", welcomeTier: "SILVER" })
    const b = await buyer()
    await spend(b.user.id, CUSTOMER_TIER_CONFIG.SILVER.minSpend)
    expect((await reason(b, welcome.code))?.eligible).toBe(true)
  })
})

describe("ngưỡng miễn phí vận chuyển theo hạng", () => {
  it("cùng giỏ 300.000 đ: Thành viên mất phí ship, hạng Vàng được miễn phí", async () => {
    const member = await buyer(150_000, 2)
    const gold = await buyer(150_000, 2)
    await spend(gold.user.id, CUSTOMER_TIER_CONFIG.GOLD.minSpend)

    const m = await createOrder(member.user, { addressId: member.addressId, paymentMethod: "COD" })
    const g = await createOrder(gold.user, { addressId: gold.addressId, paymentMethod: "COD" })
    expect(m.shippingFee).toBe(FLAT_SHIPPING_FEE)
    expect(g.shippingFee).toBe(0)
  })

  it("Kim cương luôn miễn phí vận chuyển, kể cả đơn nhỏ", async () => {
    const diamond = await buyer(50_000, 1)
    await spend(diamond.user.id, CUSTOMER_TIER_CONFIG.DIAMOND.minSpend)
    const o = await createOrder(diamond.user, { addressId: diamond.addressId, paymentMethod: "COD" })
    expect(o.subtotal).toBe(50_000)
    expect(o.shippingFee).toBe(0)
  })

  it("mã freeship báo 'đã được miễn phí vận chuyển' khi hạng của khách đã miễn phí sẵn", async () => {
    const vc = await voucher({ type: "FREESHIP", value: 30_000 })
    const diamond = await buyer(50_000, 1)
    await spend(diamond.user.id, CUSTOMER_TIER_CONFIG.DIAMOND.minSpend)
    await expect(previewVoucher(diamond.user, { code: vc.code })).rejects.toMatchObject({ code: "NO_ELIGIBLE_ITEMS" })
    const member = await buyer(50_000, 1)
    expect((await previewVoucher(member.user, { code: vc.code })).discount).toBe(FLAT_SHIPPING_FEE)
  })
})

const baseInput: VoucherInput = {
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

describe("Admin: tạo/sửa voucher có đối tượng", () => {
  it("khách cụ thể: lưu danh sách gán; sửa thì thêm/bớt khách; tự cấp (auto) không bị đụng", async () => {
    const admin = { userId: (await fx.makeAdmin()).id }
    const a = await buyer()
    const b = await buyer()
    const c = await buyer()
    const created = await createVoucher(admin, { ...baseInput, code: code("AD"), audience: "USERS", userIds: [a.user.id, b.user.id] })
    expect(created.audience).toBe("USERS")
    const assigned = async () => (await db.voucherAssignment.findMany({ where: { voucherId: created.id } })).map((x) => x.userId).sort()
    expect(await assigned()).toEqual([a.user.id, b.user.id].sort())

    // một khách được hệ thống tự cấp (auto) phải còn nguyên sau khi Admin sửa danh sách gán tay
    await db.voucherAssignment.create({ data: { voucherId: created.id, userId: c.user.id, auto: true } })
    await updateVoucher(admin, created.id, { ...baseInput, code: created.code, audience: "USERS", userIds: [b.user.id] })
    expect(await assigned()).toEqual([b.user.id, c.user.id].sort())

    const row = (await listVouchers({ q: created.code })).rows.find((r) => r.id === created.id)!
    expect(row.assignedCount).toBe(2)
    expect(row.assignedUsers.map((u) => u.id)).toEqual([b.user.id]) // chỉ khách gán tay hiện trong form

    // đổi sang "Tất cả khách": xoá hết gán
    await updateVoucher(admin, created.id, { ...baseInput, code: created.code, audience: "ALL" })
    expect(await assigned()).toEqual([])
  })

  it("theo hạng: lưu minTier; chọn hạng Thành viên hoặc thiếu hạng thì lỗi; minTier bị bỏ khi đổi đối tượng", async () => {
    const admin = { userId: (await fx.makeAdmin()).id }
    const ok = await createVoucher(admin, { ...baseInput, code: code("TR"), audience: "TIER", minTier: "GOLD" })
    expect(ok).toMatchObject({ audience: "TIER", minTier: "GOLD" })
    await expect(createVoucher(admin, { ...baseInput, code: code("TR"), audience: "TIER", minTier: null })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(createVoucher(admin, { ...baseInput, code: code("TR"), audience: "TIER", minTier: "MEMBER" })).rejects.toBeInstanceOf(AdminCatalogError)
    const back = await updateVoucher(admin, ok.id, { ...baseInput, code: ok.code, audience: "ALL", minTier: "GOLD" })
    expect(back).toMatchObject({ audience: "ALL", minTier: null })
  })

  it("khách cụ thể phải có khách hoặc hạng tự cấp; khách không tồn tại/là Admin bị từ chối; hạng tự cấp lưu được", async () => {
    const admin = { userId: (await fx.makeAdmin()).id }
    await expect(createVoucher(admin, { ...baseInput, code: code("US"), audience: "USERS", userIds: [] })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(createVoucher(admin, { ...baseInput, code: code("US"), audience: "USERS", userIds: ["khong-ton-tai"] })).rejects.toMatchObject({ code: "INVALID_INPUT" })
    await expect(createVoucher(admin, { ...baseInput, code: code("US"), audience: "USERS", userIds: [admin.userId] })).rejects.toMatchObject({ code: "INVALID_INPUT" })
    const welcome = await createVoucher(admin, { ...baseInput, code: code("US"), audience: "USERS", welcomeTier: "GOLD" })
    expect(welcome).toMatchObject({ audience: "USERS", welcomeTier: "GOLD" })
  })

  it("xoá voucher xoá luôn danh sách gán", async () => {
    const admin = { userId: (await fx.makeAdmin()).id }
    const a = await buyer()
    const v = await createVoucher(admin, { ...baseInput, code: code("DL"), audience: "USERS", userIds: [a.user.id] })
    await deleteVoucher(admin, v.id)
    expect(await db.voucherAssignment.count({ where: { voucherId: v.id } })).toBe(0)
  })
})

describe("Voucher của tôi", () => {
  it("chia dùng được / đã dùng / hết hạn; theo hạng chưa đủ nằm cuối nhóm dùng được kèm lý do; mã người khác không hiện", async () => {
    const me = await buyer(100_000, 2)
    const other = await buyer()
    await spend(me.user.id, CUSTOMER_TIER_CONFIG.SILVER.minSpend)

    const open = await voucher({ expiresAt: new Date(Date.now() + 5 * 86_400_000) })
    const soon = await voucher({ expiresAt: new Date(Date.now() + 1 * 86_400_000) })
    const tierOk = await voucher({ audience: "TIER", minTier: "SILVER" })
    const tierLocked = await voucher({ audience: "TIER", minTier: "DIAMOND" })
    const mine = await voucher({ audience: "USERS" })
    const theirs = await voucher({ audience: "USERS" })
    const expired = await voucher({ expiresAt: new Date(Date.now() - 86_400_000) })
    const exhausted = await voucher({ usageLimit: 1, usedCount: 1 })
    const off = await voucher({ isActive: false })
    await db.voucherAssignment.create({ data: { voucherId: mine.id, userId: me.user.id } })
    await db.voucherAssignment.create({ data: { voucherId: theirs.id, userId: other.user.id } })

    const usedVoucher = await voucher({ value: 10_000 })
    await createOrder(me.user, { addressId: me.addressId, paymentMethod: "COD", voucherCodes: [usedVoucher.code] })

    const res = await listMyVouchers(me.user.id)
    const usable = res.usable.map((v) => v.code)
    expect(usable).toEqual(expect.arrayContaining([open.code, soon.code, tierOk.code, mine.code, tierLocked.code]))
    // hạn gần hơn xếp trước; voucher khoá nằm cuối
    expect(usable.indexOf(soon.code)).toBeLessThan(usable.indexOf(open.code))
    expect(usable[usable.length - 1]).toBe(tierLocked.code)
    expect(res.usable.find((v) => v.code === tierLocked.code)?.locked).toContain("Kim cương")
    expect(res.usable.find((v) => v.code === mine.code)?.audienceLabel).toBe("Cấp riêng cho bạn")
    expect(res.usable.find((v) => v.code === tierOk.code)?.locked).toBeUndefined()
    expect(usable).not.toContain(theirs.code)
    expect(usable).not.toContain(off.code)
    expect(usable).not.toContain(usedVoucher.code)

    expect(res.expired.map((v) => v.code)).toEqual(expect.arrayContaining([expired.code, exhausted.code]))
    expect(res.expired.find((v) => v.code === exhausted.code)?.expiredReason).toBe("Hết lượt")
    expect(res.expired.find((v) => v.code === expired.code)?.expiredReason).toBe("Hết hạn")

    const used = res.used.find((v) => v.code === usedVoucher.code)
    expect(used?.orderCode).toMatch(/^FS-/)
    expect(used?.usedAt).toBeTruthy()
  })

  it("vừa lên hạng thì voucher chào mừng xuất hiện ngay trong lần xem này", async () => {
    const welcome = await voucher({ audience: "USERS", welcomeTier: "SILVER" })
    const me = await buyer()
    await spend(me.user.id, CUSTOMER_TIER_CONFIG.SILVER.minSpend)
    const res = await listMyVouchers(me.user.id)
    expect(res.usable.find((v) => v.code === welcome.code)?.audienceLabel).toBe("Quà hạng Bạc")
  })
})
