import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { db } from "@/server/db"
import { createFixtures } from "@/test/db-fixtures"
import { updatePaymentAccount } from "./admin-payment-account.service"
import { AdminCatalogError } from "./admin-catalog.service"
import { createOrder } from "./order.service"
import { getPaymentAccount, PAYMENT_ACCOUNT_ID } from "./payment-account.service"
import { getTransferReportedAt, reportBankTransferPaid } from "./payment.service"

/*
 * Tài khoản nhận QR do Admin cấu hình (DB, fallback .env) và khách báo "Tôi đã chuyển khoản".
 * Bảng PaymentAccount chỉ có một dòng dùng chung nên mỗi test dọn dòng này trước và sau.
 */
const fx = createFixtures()
const clear = () => db.paymentAccount.deleteMany({ where: { id: PAYMENT_ACCOUNT_ID } })
beforeEach(clear)
afterAll(async () => {
  await clear()
  await fx.cleanup()
})

describe("tài khoản nhận chuyển khoản", () => {
  it("chưa cấu hình thì dùng BANK_* trong .env (source env)", async () => {
    expect((await getPaymentAccount()).source).toBe("env")
  })

  it("Admin lưu: chuẩn hoá số tài khoản và tên (HOA, bỏ dấu), tên ngân hàng lấy theo mã BIN, source db", async () => {
    const admin = await fx.makeAdmin()
    const acc = await updatePaymentAccount({ userId: admin.id }, { bankBin: "970436", accountNo: " 0123 4567 89 ", accountName: "  Nguyễn Văn Đạt  " })
    expect(acc).toMatchObject({ source: "db", bin: "970436", name: "Vietcombank", accountNo: "0123456789", accountName: "NGUYEN VAN DAT" })
    // Lưu lần hai ghi đè (một dòng duy nhất)
    await updatePaymentAccount({ userId: admin.id }, { bankBin: "970422", accountNo: "999988882026", accountName: "Cua Hang" })
    expect(await db.paymentAccount.count()).toBe(1)
    expect((await getPaymentAccount()).name).toBe("MB Bank")
  })

  it("từ chối: ngân hàng ngoài danh sách, số tài khoản sai, tên chứa ký tự lạ", async () => {
    const admin = { userId: (await fx.makeAdmin()).id }
    const ok = { bankBin: "970422", accountNo: "123456789", accountName: "CUA HANG" }
    await expect(updatePaymentAccount(admin, { ...ok, bankBin: "000000" })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(updatePaymentAccount(admin, { ...ok, accountNo: "12ab" })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(updatePaymentAccount(admin, { ...ok, accountNo: "1".repeat(20) })).rejects.toBeInstanceOf(AdminCatalogError)
    await expect(updatePaymentAccount(admin, { ...ok, accountName: "<b>HACK</b>" })).rejects.toBeInstanceOf(AdminCatalogError)
    expect((await getPaymentAccount()).source).toBe("env") // không lưu gì
  })
})

async function placeTransfer() {
  const v = await fx.makeVariant(5)
  const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])
  const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "BANK_TRANSFER" })
  return { buyer, order }
}
const reportNotes = (orderId: string) => db.adminNotification.findMany({ where: { href: { contains: orderId }, title: { contains: "Khách báo đã chuyển khoản" } } })

describe("khách báo đã chuyển khoản", () => {
  it("ghi nhận thời điểm và báo Admin; KHÔNG đổi trạng thái thanh toán", async () => {
    const { buyer, order } = await placeTransfer()
    const { reportedAt } = await reportBankTransferPaid(buyer.user, order.id)
    expect(await getTransferReportedAt(buyer.user.id, order.id)).toEqual(reportedAt)
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PENDING")
    const notes = await reportNotes(order.id)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ category: "PAYMENT" })
    expect(notes[0].body).toContain(order.code.replaceAll("-", ""))
  })

  it("bấm lại là idempotent: giữ thời điểm đầu, không tạo thêm thông báo", async () => {
    const { buyer, order } = await placeTransfer()
    const first = await reportBankTransferPaid(buyer.user, order.id)
    const second = await reportBankTransferPaid(buyer.user, order.id)
    expect(second.reportedAt).toEqual(first.reportedAt)
    expect(await reportNotes(order.id)).toHaveLength(1)
  })

  it("hai lần bấm đồng thời chỉ tạo một thông báo", async () => {
    const { buyer, order } = await placeTransfer()
    await Promise.all([reportBankTransferPaid(buyer.user, order.id), reportBankTransferPaid(buyer.user, order.id)])
    expect(await reportNotes(order.id)).toHaveLength(1)
  })

  it("từ chối: đơn của người khác, đơn COD, đơn đã huỷ, đơn đã thanh toán", async () => {
    const { buyer, order } = await placeTransfer()
    const stranger = await fx.makeBuyer([])
    await expect(reportBankTransferPaid(stranger.user, order.id)).rejects.toMatchObject({ code: "ORDER_NOT_FOUND" })

    const v = await fx.makeVariant(5)
    const cod = await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])
    const codOrder = await createOrder(cod.user, { addressId: cod.addressId, paymentMethod: "COD" })
    await expect(reportBankTransferPaid(cod.user, codOrder.id)).rejects.toMatchObject({ code: "CANNOT_PAY" })

    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } })
    await expect(reportBankTransferPaid(buyer.user, order.id)).rejects.toMatchObject({ code: "CANNOT_PAY" })

    const second = await placeTransfer()
    await db.order.update({ where: { id: second.order.id }, data: { status: "CANCELLED" } })
    await expect(reportBankTransferPaid(second.buyer.user, second.order.id)).rejects.toMatchObject({ code: "CANNOT_PAY" })
  })
})
