import { afterAll, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { LOW_STOCK_THRESHOLD } from "@/lib/inventory"
import { db } from "@/server/db"
import { createFixtures } from "@/test/db-fixtures"
import {
  deleteOldAdminNotifications,
  listAdminNotifications,
  listAdminNotificationsPage,
  markAdminNotificationRead,
  markAdminNotificationsSeen,
} from "./admin-notification.service"
import { adminCancelOrder } from "./admin-order.service"
import { adjustStock } from "./admin-product.service"
import { cancelOrder, createOrder } from "./order.service"

/*
 * Hộp thư sự kiện của Admin: sự kiện nào tạo thông báo, trạng thái đọc theo từng Admin, lọc và phân trang.
 * Bảng AdminNotification là bảng chung nên mọi kiểm tra đều lọc theo mã đơn / tên sản phẩm của chính test.
 */
const fx = createFixtures()
const needles: string[] = []
afterAll(async () => {
  for (const n of needles) await db.adminNotification.deleteMany({ where: { OR: [{ href: { contains: n } }, { title: { contains: n } }, { body: { contains: n } }] } })
  await fx.cleanup()
})

// Mã đơn bị tái dùng giữa các file test (bộ đếm được trả về khi dọn), nên thông báo của đơn được tìm theo id đơn trong liên kết.
const forOrder = (orderId: string) => db.adminNotification.findMany({ where: { href: { contains: orderId } } })
const about = (needle: string) => db.adminNotification.findMany({ where: { OR: [{ title: { contains: needle } }, { body: { contains: needle } }] } })

async function place(method: "COD" | "BANK_TRANSFER", stock = 50) {
  const v = await fx.makeVariant(stock)
  const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 2 }])
  const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: method })
  needles.push(order.id)
  return { v, buyer, order }
}

describe("sự kiện tạo thông báo cho Admin", () => {
  it("đặt đơn COD: một thông báo ORDER có tên khách, tổng tiền và liên kết tới đơn", async () => {
    const { order } = await place("COD")
    const rows = await forOrder(order.id)
    expect(rows.map((r) => r.category)).toEqual(["ORDER"])
    expect(rows[0].title).toBe(`Đơn mới #${order.code}`)
    expect(rows[0].body).toContain("Người Mua Thử")
    expect(rows[0].body).toContain("COD")
    expect(rows[0].href).toBe(`/admin/orders/${order.id}`)
  })

  it("đặt đơn chuyển khoản: thêm thông báo PAYMENT chờ xác nhận kèm nội dung chuyển khoản và hạn", async () => {
    const { order } = await place("BANK_TRANSFER")
    const rows = await forOrder(order.id)
    expect(rows.map((r) => r.category).sort()).toEqual(["ORDER", "PAYMENT"])
    const pay = rows.find((r) => r.category === "PAYMENT")!
    expect(pay.title).toContain("Chờ xác nhận chuyển khoản")
    expect(pay.body).toContain(order.code.replaceAll("-", ""))
    expect(pay.body).toContain("24 giờ")
  })

  it("khách huỷ đơn: có thông báo huỷ kèm lý do; Admin tự huỷ thì không", async () => {
    const byCustomer = await place("COD")
    await cancelOrder(byCustomer.buyer.user, byCustomer.order.id, "Đổi ý")
    const cancelled = (await forOrder(byCustomer.order.id)).find((r) => r.title.includes("đã bị huỷ"))
    expect(cancelled?.body).toBe("Khách huỷ: Đổi ý")

    const byAdmin = await place("COD")
    const admin = await fx.makeAdmin()
    await adminCancelOrder({ userId: admin.id }, byAdmin.order.id, "Hết hàng thật")
    expect((await forOrder(byAdmin.order.id)).some((r) => r.title.includes("đã bị huỷ"))).toBe(false)
  })

  it("biến thể vừa tụt xuống ngưỡng sắp hết hàng thì báo STOCK một lần; còn trên ngưỡng thì không", async () => {
    const low = await place("COD", LOW_STOCK_THRESHOLD + 1) // 11 - 2 = 9 ≤ 10, trước đó trên ngưỡng
    const product = await db.product.findFirstOrThrow({ where: { variants: { some: { id: low.v.id } } }, select: { name: true } })
    needles.push(product.name)
    const stock = (await about(product.name)).filter((r) => r.category === "STOCK")
    expect(stock).toHaveLength(1)
    expect(stock[0].title).toContain("Sắp hết hàng")
    expect(stock[0].body).toContain(`còn ${LOW_STOCK_THRESHOLD - 1} sản phẩm`)

    const plenty = await place("COD", 50)
    const p2 = await db.product.findFirstOrThrow({ where: { variants: { some: { id: plenty.v.id } } }, select: { name: true } })
    needles.push(p2.name)
    expect((await about(p2.name)).filter((r) => r.category === "STOCK")).toHaveLength(0)
  })
})

describe("trạng thái đọc theo từng Admin", () => {
  it("đánh dấu đã đọc chỉ ảnh hưởng Admin đó; thông báo mới sau mốc lại là chưa đọc", async () => {
    const a1 = await fx.makeAdmin()
    const a2 = await fx.makeAdmin()
    await place("COD")
    expect((await listAdminNotifications(a1.id)).unread).toBeGreaterThan(0)

    await markAdminNotificationsSeen(a1.id)
    const afterSeen = await listAdminNotifications(a1.id)
    expect(afterSeen.unread).toBe(0)
    expect(afterSeen.items.every((n) => n.read)).toBe(true)
    expect((await listAdminNotifications(a2.id)).unread).toBeGreaterThan(0) // Admin khác không bị ảnh hưởng

    await new Promise((r) => setTimeout(r, 15)) // đảm bảo createdAt sau mốc
    const { order } = await place("COD")
    const again = await listAdminNotifications(a1.id)
    expect(again.unread).toBeGreaterThanOrEqual(1)
    expect(again.items.find((n) => n.title.includes(order.code))?.read).toBe(false)
  })

  it("lọc theo loại và phân trang ở trang đầy đủ", async () => {
    const admin = await fx.makeAdmin()
    const { order } = await place("BANK_TRANSFER")
    const payment = await listAdminNotificationsPage(admin.id, { category: "PAYMENT" })
    expect(payment.items.every((n) => n.category === "PAYMENT")).toBe(true)
    expect(payment.items.some((n) => n.title.includes(order.code))).toBe(true)
    // Trang ngoài phạm vi về trang cuối, không lỗi
    const far = await listAdminNotificationsPage(admin.id, { page: 9999 })
    expect(far.page).toBe(far.pageCount)
  })
})

describe("đánh dấu đã đọc từng dòng", () => {
  it("chỉ dòng đó thành đã đọc cho Admin đó; số chưa đọc giảm một; gọi lại không lỗi", async () => {
    const a1 = await fx.makeAdmin()
    const a2 = await fx.makeAdmin()
    const first = await place("COD")
    const second = await place("COD")
    const idOf = async (orderId: string) => (await forOrder(orderId))[0].id

    const before = await listAdminNotifications(a1.id)
    await markAdminNotificationRead(a1.id, await idOf(first.order.id))
    await markAdminNotificationRead(a1.id, await idOf(first.order.id)) // lần hai: bỏ qua
    const after = await listAdminNotifications(a1.id)

    expect(after.unread).toBe(before.unread - 1)
    expect(after.items.find((n) => n.title.includes(second.order.code))?.read).toBe(false)
    expect(after.items.find((n) => n.title.includes(first.order.code))?.read).toBe(true)
    expect((await listAdminNotifications(a2.id)).items.find((n) => n.title.includes(first.order.code))?.read).toBe(false)
    const page = await listAdminNotificationsPage(a1.id, { category: "ORDER" })
    expect(page.items.find((n) => n.title.includes(first.order.code))?.read).toBe(true)
  })

  it("thông báo không tồn tại thì bỏ qua, không lỗi", async () => {
    const admin = await fx.makeAdmin()
    await expect(markAdminNotificationRead(admin.id, "khong-ton-tai")).resolves.toBeUndefined()
  })
})

describe("báo sắp hết hàng khi Admin làm tụt tồn", () => {
  const adminCtx = { userId: "test-admin" }
  const stockRows = async (variantId: string) => {
    const product = await db.product.findFirstOrThrow({ where: { variants: { some: { id: variantId } } }, select: { name: true } })
    needles.push(product.name)
    return (await about(product.name)).filter((r) => r.category === "STOCK")
  }

  it("trừ kho (kiểm kê) xuống ngưỡng: báo một lần; tiếp tục trừ khi đã dưới ngưỡng thì không báo thêm", async () => {
    const v = await fx.makeVariant(LOW_STOCK_THRESHOLD + 5)
    await adjustStock(adminCtx, v.id, { delta: -2 }) // 13 > 10: chưa báo
    expect(await stockRows(v.id)).toHaveLength(0)
    await adjustStock(adminCtx, v.id, { delta: -4 }) // 13 -> 9: vừa tụt xuống ngưỡng
    const rows = await stockRows(v.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toContain("Sắp hết hàng")
    await adjustStock(adminCtx, v.id, { delta: -1 }) // 9 -> 8: đã dưới ngưỡng từ trước
    expect(await stockRows(v.id)).toHaveLength(1)
  })

  it("đặt lại tồn về 0: báo 'Hết hàng'; nhập thêm kho thì không báo", async () => {
    const v = await fx.makeVariant(50)
    await adjustStock(adminCtx, v.id, { delta: 100 })
    expect(await stockRows(v.id)).toHaveLength(0)
    await adjustStock(adminCtx, v.id, { newStock: 0 })
    const rows = await stockRows(v.id)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toContain("Hết hàng")
  })
})

describe("dọn thông báo cũ", () => {
  it("xoá thông báo cũ hơn hạn lưu (kèm trạng thái đã đọc), giữ thông báo mới", async () => {
    const admin = await fx.makeAdmin()
    const tag = `cleanup-${Date.now()}`
    needles.push(tag)
    const old = await db.adminNotification.create({ data: { category: "ORDER", title: `${tag} cũ`, createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) } })
    const fresh = await db.adminNotification.create({ data: { category: "ORDER", title: `${tag} mới`, createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000) } })
    await markAdminNotificationRead(admin.id, old.id)

    const { deleted } = await deleteOldAdminNotifications()
    expect(deleted).toBeGreaterThanOrEqual(1)
    expect(await db.adminNotification.findUnique({ where: { id: old.id } })).toBeNull()
    expect(await db.adminNotification.findUnique({ where: { id: fresh.id } })).not.toBeNull()
    expect(await db.adminNotificationRead.count({ where: { notificationId: old.id } })).toBe(0) // xoá theo (cascade)
  })
})
