import { beforeEach, describe, expect, it, vi } from "vitest"

// Transport giả viết tay (không dùng vi.fn trả promise bị từ chối: vitest tính đó là lỗi chưa xử lý dù sendMail đã bắt).
const smtp = vi.hoisted(() => ({ sent: [] as unknown[], failWith: null as string | null }))
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: async (m: unknown) => {
        smtp.sent.push(m)
        if (smtp.failWith) throw new Error(smtp.failWith)
        return {}
      },
    }),
  },
}))

import { parseMailEnv } from "./env"
import { sendMail } from "./send"
import { renderOrderEmail, type OrderEmailData } from "./templates/order-email"

const ON = { MAIL_ENABLED: "true", MAIL_FROM: "Shop <no-reply@example.com>", SMTP_HOST: "localhost" }

describe("parseMailEnv", () => {
  it("mặc định tắt (MAIL_ENABLED không phải true), kể cả khi đủ cấu hình", () => {
    expect(parseMailEnv({}).enabled).toBe(false)
    expect(parseMailEnv({ ...ON, MAIL_ENABLED: "false" }).enabled).toBe(false)
    expect(parseMailEnv({ ...ON, MAIL_ENABLED: undefined }).enabled).toBe(false)
  })

  it("bật nhưng thiếu cấu hình bắt buộc thì tự tắt kèm lý do (không ném lỗi)", () => {
    const r = parseMailEnv({ MAIL_ENABLED: "true", SMTP_HOST: "localhost" })
    expect(r).toMatchObject({ enabled: false })
    expect(r.enabled === false && r.reason).toContain("MAIL_FROM")
  })

  it("đủ cấu hình: giá trị mặc định cho Mailpit (cổng 1025, không TLS, không đăng nhập)", () => {
    expect(parseMailEnv(ON)).toEqual({
      enabled: true,
      config: { from: "Shop <no-reply@example.com>", host: "localhost", port: 1025, secure: false, user: undefined, pass: undefined },
    })
  })

  it("chuỗi rỗng coi như chưa đặt; có SMTP_USER thì phải có SMTP_PASS", () => {
    expect(parseMailEnv({ ...ON, SMTP_PORT: "" })).toMatchObject({ enabled: true, config: { port: 1025 } })
    expect(parseMailEnv({ ...ON, SMTP_USER: "u" }).enabled).toBe(false)
    expect(parseMailEnv({ ...ON, SMTP_USER: "u", SMTP_PASS: "p", SMTP_PORT: "587", SMTP_SECURE: "true" })).toMatchObject({
      enabled: true,
      config: { user: "u", pass: "p", port: 587, secure: true },
    })
  })
})

describe("sendMail", () => {
  beforeEach(() => {
    smtp.sent.length = 0
    smtp.failWith = null
  })
  const msg = { to: "a@b.vn", subject: "s", html: "<p>x</p>", text: "x" }

  it("tắt thì không gửi và trả lý do", async () => {
    const r = await sendMail(msg, { enabled: false, reason: "tắt" })
    expect(r).toEqual({ sent: false, reason: "tắt" })
    expect(smtp.sent).toHaveLength(0)
  })

  it("bật: gửi với người gửi từ cấu hình", async () => {
    const status = parseMailEnv(ON)
    expect(await sendMail(msg, status)).toEqual({ sent: true })
    expect(smtp.sent).toEqual([{ from: "Shop <no-reply@example.com>", ...msg }])
  })

  it("lỗi SMTP không ném ra ngoài, trả sent:false và lý do không chứa địa chỉ người nhận", async () => {
    smtp.failWith = "connect ECONNREFUSED 127.0.0.1:1025\n  at stack..."
    const r = await sendMail(msg, parseMailEnv(ON))
    expect(r.sent).toBe(false)
    expect(r.sent === false && r.reason).toBe("connect ECONNREFUSED 127.0.0.1:1025")
    expect(JSON.stringify(r)).not.toContain("a@b.vn")
  })
})

const DATA: OrderEmailData = {
  siteName: "Fashion Store",
  code: "FS-20261117-0001",
  orderUrl: "http://localhost:3000/account/orders/abc",
  subtotal: 1_297_000,
  shippingFee: 0,
  total: 1_297_000,
  paymentLabel: "Thanh toán khi nhận hàng (COD)",
  items: [{ productName: "Áo <b>thun</b> & basic", size: "S", color: "Đen", quantity: 2, unitPrice: 648_500 }],
  address: { fullName: "Nguyễn Minh Anh", phone: "0987654321", street: "123 Nguyễn Huệ", ward: "Phường Sài Gòn", province: "Thành phố Hồ Chí Minh" },
}

describe("renderOrderEmail", () => {
  it.each(["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"] as const)("%s: tiêu đề có tên cửa hàng và mã đơn, thân có tổng tiền và liên kết", (status) => {
    const r = renderOrderEmail(status, DATA)
    expect(r.subject).toContain("[Fashion Store]")
    expect(r.subject).toContain("FS-20261117-0001")
    expect(r.html).toContain("1.297.000")
    expect(r.html).toContain("http://localhost:3000/account/orders/abc")
    expect(r.text).toContain("Xem chi tiết đơn hàng: http://localhost:3000/account/orders/abc")
  })

  it("escape HTML trong dữ liệu người dùng (tên sản phẩm)", () => {
    const r = renderOrderEmail("PENDING", DATA)
    expect(r.html).not.toContain("<b>thun</b>")
    expect(r.html).toContain("&lt;b&gt;thun&lt;/b&gt; &amp; basic")
  })

  it("phí ship 0 hiện Miễn phí; có phí thì hiện số tiền", () => {
    expect(renderOrderEmail("PENDING", DATA).text).toContain("Phí vận chuyển: Miễn phí")
    expect(renderOrderEmail("PENDING", { ...DATA, shippingFee: 30_000 }).text).toContain("Phí vận chuyển: 30.000")
  })
})
