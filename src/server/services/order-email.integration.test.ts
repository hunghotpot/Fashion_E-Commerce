import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sendMailMock = vi.fn()
vi.mock("@/server/mail/send", () => ({ sendMail: (...a: unknown[]) => sendMailMock(...a) }))

import { createFixtures } from "@/test/db-fixtures"
import { cancelOrder, changeOrderStatus, createOrder } from "./order.service"
import { sendOrderEmail } from "./order-email.service"

/*
 * Test tích hợp trên DB test riêng: email chỉ được soạn khi bật (MAIL_ENABLED), gửi cho đúng chủ đơn, và lỗi gửi không làm hỏng đơn.
 * `sendMail` được giả nên không có kết nối SMTP thật.
 */
const fx = createFixtures()
afterAll(fx.cleanup)

const ENV_KEYS = ["MAIL_ENABLED", "MAIL_FROM", "SMTP_HOST"] as const
const saved: Record<string, string | undefined> = {}
beforeEach(() => {
  sendMailMock.mockReset()
  for (const k of ENV_KEYS) saved[k] = process.env[k]
})
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})
const enableMail = () => Object.assign(process.env, { MAIL_ENABLED: "true", MAIL_FROM: "Shop <no-reply@example.com>", SMTP_HOST: "localhost" })
const flush = () => new Promise((r) => setTimeout(r, 50)) // email chạy nền sau commit

async function placeOrder() {
  const v = await fx.makeVariant(5)
  const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 2 }])
  const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD" })
  return { buyer, order }
}

describe("email đơn hàng", () => {
  it("tắt (mặc định): không soạn, không gửi", async () => {
    delete process.env.MAIL_ENABLED
    const { order } = await placeOrder()
    await sendOrderEmail(order.id, "CONFIRMED")
    await flush()
    expect(sendMailMock).not.toHaveBeenCalled()
  })

  it("bật: đặt đơn gửi email xác nhận cho chủ đơn, có mã đơn và tổng tiền", async () => {
    enableMail()
    sendMailMock.mockResolvedValue({ sent: true })
    const { buyer, order } = await placeOrder()
    await flush()
    expect(sendMailMock).toHaveBeenCalledTimes(1)
    const [msg] = sendMailMock.mock.calls[0]
    expect(msg.to).toBe(buyer.user.email)
    expect(msg.subject).toContain(order.code)
    expect(msg.subject).toContain("Đặt hàng thành công")
    expect(msg.html).toContain(`/account/orders/${order.id}`)
  })

  it("đổi trạng thái và huỷ cũng gửi email với tiêu đề tương ứng", async () => {
    enableMail()
    sendMailMock.mockResolvedValue({ sent: true })
    const { buyer, order } = await placeOrder()
    const admin = await fx.makeAdmin()
    await flush()
    sendMailMock.mockClear()

    await changeOrderStatus(order.id, "CONFIRMED", { type: "ADMIN", userId: admin.id })
    await flush()
    expect(sendMailMock.mock.calls[0][0].subject).toContain("đã được xác nhận")

    await cancelOrder(buyer.user, order.id, "Đổi ý")
    await flush()
    expect(sendMailMock.mock.calls[1][0].subject).toContain("đã được huỷ")
  })

  it("gửi lỗi (hoặc sendMail ném lỗi) thì đơn hàng vẫn thành công, không ném ra ngoài", async () => {
    enableMail()
    sendMailMock.mockImplementation(async () => {
      throw new Error("SMTP sập")
    })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { order } = await placeOrder()
    await flush()
    expect(order.status).toBe("PENDING")
    expect(warn).toHaveBeenCalled()
    // Log chỉ có mã đơn và lý do, không có địa chỉ email hay địa chỉ giao hàng.
    const logged = warn.mock.calls.flat().join(" ")
    expect(logged).toContain("[mail]")
    expect(logged).not.toContain("@test.local")
    warn.mockRestore()
  })
})
