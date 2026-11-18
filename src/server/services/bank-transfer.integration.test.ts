import { afterAll, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { BANK_TRANSFER_WINDOW_HOURS } from "@/lib/order"
import { db } from "@/server/db"
import { createFixtures } from "@/test/db-fixtures"
import { countAwaitingTransfer, listAllOrders, markBankTransferPaid } from "./admin-order.service"
import { getCustomerSpend } from "./customer-spend"
import { cancelOrder, changeOrderStatus, createOrder } from "./order.service"
import { expireUnpaidBankTransferOrders, expireUnpaidOrders } from "./payment.service"

/*
 * Chuyển khoản do Admin xác nhận tay: hạn 24 giờ tự huỷ, báo khách khi xác nhận tiền, bộ lọc "chờ xác nhận".
 */
const fx = createFixtures()
afterAll(fx.cleanup)

const HOUR = 3_600_000
const ago = (hours: number) => new Date(Date.now() - hours * HOUR)

async function placeTransfer(method: "BANK_TRANSFER" | "COD" = "BANK_TRANSFER") {
  const v = await fx.makeVariant(5)
  const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 2 }])
  const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: method })
  return { v, buyer, order }
}
const backdate = (orderId: string, hours: number) => db.order.update({ where: { id: orderId }, data: { createdAt: ago(hours) } })

describe("tự huỷ đơn chuyển khoản quá hạn", () => {
  it("quá 24 giờ chưa xác nhận tiền: huỷ, hoàn kho, ghi lý do; chưa quá hạn thì giữ", async () => {
    const late = await placeTransfer()
    const fresh = await placeTransfer()
    await backdate(late.order.id, BANK_TRANSFER_WINDOW_HOURS + 1)
    await backdate(fresh.order.id, BANK_TRANSFER_WINDOW_HOURS - 1)

    const { cancelled } = await expireUnpaidBankTransferOrders()
    expect(cancelled).toBeGreaterThanOrEqual(1)

    expect((await db.order.findUniqueOrThrow({ where: { id: late.order.id } })).status).toBe("CANCELLED")
    expect(await fx.stockOf(late.v.id)).toBe(5) // đã hoàn kho
    expect((await db.order.findUniqueOrThrow({ where: { id: fresh.order.id } })).status).toBe("PENDING")
    const history = await db.orderStatusHistory.findMany({ where: { orderId: late.order.id }, orderBy: { createdAt: "asc" } })
    expect(history.at(-1)).toMatchObject({ toStatus: "CANCELLED", actorType: "SYSTEM", note: "Quá hạn thanh toán" })
    // khách được báo qua chuông
    expect(await db.notification.count({ where: { userId: late.buyer.user.id, title: { contains: "đã được huỷ" } } })).toBe(1)
  })

  it("đã xác nhận tiền, đã được Admin duyệt, hoặc là COD thì không bị huỷ", async () => {
    const paid = await placeTransfer()
    const admin = await fx.makeAdmin()
    await markBankTransferPaid({ userId: admin.id }, paid.order.id)
    const confirmed = await placeTransfer()
    await changeOrderStatus(confirmed.order.id, "CONFIRMED", { type: "ADMIN", userId: admin.id })
    const cod = await placeTransfer("COD")
    for (const o of [paid, confirmed, cod]) await backdate(o.order.id, BANK_TRANSFER_WINDOW_HOURS + 5)

    await expireUnpaidOrders()
    for (const o of [paid, confirmed, cod]) {
      expect((await db.order.findUniqueOrThrow({ where: { id: o.order.id } })).status).not.toBe("CANCELLED")
    }
  })

  it("hoàn lượt voucher khi đơn quá hạn bị huỷ", async () => {
    const voucher = await db.voucher.create({
      data: { code: `BT${Date.now().toString(36).toUpperCase()}`, name: "Thử", type: "CASH", value: 10_000, usageLimit: 5 },
    })
    try {
      const v = await fx.makeVariant(5, 200_000)
      const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])
      // Voucher chỉ áp COD nên đặt COD rồi đổi phương thức để mô phỏng đơn có voucher chờ chuyển khoản.
      const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD", voucherCodes: [voucher.code] })
      await db.order.update({ where: { id: order.id }, data: { paymentMethod: "BANK_TRANSFER", createdAt: ago(BANK_TRANSFER_WINDOW_HOURS + 1) } })
      await expireUnpaidBankTransferOrders()
      expect((await db.voucher.findUniqueOrThrow({ where: { id: voucher.id } })).usedCount).toBe(0)
    } finally {
      await db.voucher.delete({ where: { id: voucher.id } }).catch(() => undefined)
    }
  })
})

describe("xác nhận đã nhận tiền", () => {
  it("báo cho khách qua chuông, trạng thái đơn giữ nguyên", async () => {
    const { buyer, order } = await placeTransfer()
    const admin = await fx.makeAdmin()
    await markBankTransferPaid({ userId: admin.id }, order.id)

    const row = await db.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(row).toMatchObject({ status: "PENDING", paymentStatus: "PAID" })
    const note = await db.notification.findFirst({ where: { userId: buyer.user.id, title: { contains: "Đã nhận thanh toán" } } })
    expect(note?.href).toBe(`/account/orders/${order.id}`)
    expect(note?.body).toContain("xác nhận nhận được tiền")
  })

  it("xác nhận lần hai bị từ chối và không tạo thêm thông báo", async () => {
    const { buyer, order } = await placeTransfer()
    const admin = await fx.makeAdmin()
    await markBankTransferPaid({ userId: admin.id }, order.id)
    await expect(markBankTransferPaid({ userId: admin.id }, order.id)).rejects.toMatchObject({ code: "CANNOT_PAY" })
    expect(await db.notification.count({ where: { userId: buyer.user.id, title: { contains: "Đã nhận thanh toán" } } })).toBe(1)
  })
})

describe("bộ lọc chờ xác nhận chuyển khoản", () => {
  it("chỉ trả đơn chuyển khoản chưa huỷ, chưa xác nhận tiền; đếm khớp", async () => {
    const waiting = await placeTransfer()
    const paid = await placeTransfer()
    const cod = await placeTransfer("COD")
    const admin = await fx.makeAdmin()
    await markBankTransferPaid({ userId: admin.id }, paid.order.id)

    const before = await countAwaitingTransfer()
    const list = await listAllOrders({ awaiting: "transfer", pageSize: 50 })
    const ids = list.items.map((o) => o.id)
    expect(ids).toContain(waiting.order.id)
    expect(ids).not.toContain(paid.order.id)
    expect(ids).not.toContain(cod.order.id)
    expect(list.total).toBe(before)
    expect(list.items.every((o) => o.paymentMethod === "BANK_TRANSFER" && o.paymentStatus === "PENDING" && o.status !== "CANCELLED")).toBe(true)
  })
})

describe("giao hàng thành công và thanh toán", () => {
  const advanceToDelivered = async (orderId: string) => {
    const admin = await fx.makeAdmin()
    for (const to of ["CONFIRMED", "SHIPPING", "DELIVERED"] as const) await changeOrderStatus(orderId, to, { type: "ADMIN", userId: admin.id })
  }

  it("đơn COD giao xong tự thành Đã thanh toán và ghi chú thu tiền vào lịch sử", async () => {
    const { order } = await placeTransfer("COD")
    await advanceToDelivered(order.id)
    expect(await db.order.findUniqueOrThrow({ where: { id: order.id } })).toMatchObject({ status: "DELIVERED", paymentStatus: "PAID" })
    const last = await db.orderStatusHistory.findFirstOrThrow({ where: { orderId: order.id, toStatus: "DELIVERED" } })
    expect(last.note).toBe("Đã thu tiền COD khi giao hàng")
  })

  it("đơn chuyển khoản giao xong mà chưa xác nhận tiền thì KHÔNG tự thành đã thanh toán", async () => {
    const { order } = await placeTransfer("BANK_TRANSFER")
    await advanceToDelivered(order.id)
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING")
  })
})

describe("tổng chi tiêu của khách (hạng thành viên)", () => {
  it("chỉ cộng đơn đã giao (COD) hoặc đã thanh toán; đơn chờ và đơn huỷ không tính", async () => {
    const v = await fx.makeVariant(10, 100_000)
    const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 2 }])
    expect(await getCustomerSpend(buyer.user.id)).toBe(0)
    const first = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD" })
    expect(await getCustomerSpend(buyer.user.id)).toBe(0) // đơn vừa đặt, chưa giao
    const admin = await fx.makeAdmin()
    for (const to of ["CONFIRMED", "SHIPPING", "DELIVERED"] as const) await changeOrderStatus(first.id, to, { type: "ADMIN", userId: admin.id })
    expect(await getCustomerSpend(buyer.user.id)).toBe(first.total)
  })

  it("đơn bị huỷ không bao giờ được tính", async () => {
    const v = await fx.makeVariant(10, 100_000)
    const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 2 }])
    const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD" })
    await cancelOrder(buyer.user, order.id)
    expect(await getCustomerSpend(buyer.user.id)).toBe(0)
  })
})
