import { afterAll, describe, expect, it } from "vitest"
import { db } from "@/server/db"
import { createFixtures } from "@/test/db-fixtures"
import { listNotifications, listNotificationsPage, markNotificationsRead, NOTIFICATION_PAGE_SIZE } from "./notification.service"
import { cancelOrder, changeOrderStatus, createOrder } from "./order.service"

/*
 * Test tích hợp trên DB test riêng: thông báo được tạo khi đơn đổi trạng thái, chỉ chủ đơn thấy và sửa được.
 * User test bị xoá khi dọn nên thông báo (ON DELETE CASCADE) cũng mất theo.
 */
const fx = createFixtures()
afterAll(fx.cleanup)

async function placeOrder() {
  const v = await fx.makeVariant(5)
  const buyer = await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])
  const order = await createOrder(buyer.user, { addressId: buyer.addressId, paymentMethod: "COD" })
  return { buyer, order }
}

describe("thông báo đổi trạng thái đơn", () => {
  it("đặt đơn báo thành công; mỗi lần đổi trạng thái báo thêm một dòng cho chủ đơn, mới nhất lên đầu", async () => {
    const { buyer, order } = await placeOrder()
    const admin = await fx.makeAdmin()
    const placed = await listNotifications(buyer.user.id)
    expect(placed.unread).toBe(1)
    expect(placed.items[0].title).toBe(`Đặt hàng thành công, đơn #${order.code}`)
    // Nội dung có tổng tiền và số sản phẩm để khách khỏi phải mở chi tiết đơn.
    expect(placed.items[0].body).toContain("1 sản phẩm")

    await changeOrderStatus(order.id, "CONFIRMED", { type: "ADMIN", userId: admin.id })
    await changeOrderStatus(order.id, "SHIPPING", { type: "SYSTEM" })

    const { items, unread } = await listNotifications(buyer.user.id)
    expect(unread).toBe(3)
    expect(items.map((i) => i.title)).toEqual([
      `Đơn #${order.code} đang được giao`,
      `Đơn #${order.code} đã được xác nhận`,
      `Đặt hàng thành công, đơn #${order.code}`,
    ])
    expect(items[0]).toMatchObject({ read: false, href: `/account/orders/${order.id}` })
    // Người khác (Admin) không nhận thông báo của đơn này.
    expect((await listNotifications(admin.id)).items).toEqual([])
  })

  it("huỷ đơn cũng báo cho chủ đơn", async () => {
    const { buyer, order } = await placeOrder()
    await cancelOrder(buyer.user, order.id, "Đổi ý")
    const { items } = await listNotifications(buyer.user.id)
    expect(items).toHaveLength(2) // đặt hàng + huỷ
    expect(items[0].title).toBe(`Đơn #${order.code} đã được huỷ`)
  })
})

describe("đánh dấu đã đọc", () => {
  it("chỉ các id được chọn; không có ids thì tất cả; không đụng thông báo của người khác", async () => {
    const a = await placeOrder()
    const b = await placeOrder()
    const admin = await fx.makeAdmin()
    await changeOrderStatus(a.order.id, "CONFIRMED", { type: "ADMIN", userId: admin.id })
    await changeOrderStatus(a.order.id, "SHIPPING", { type: "ADMIN", userId: admin.id })
    await changeOrderStatus(b.order.id, "CONFIRMED", { type: "ADMIN", userId: admin.id })

    const mine = await listNotifications(a.buyer.user.id)
    expect(mine.unread).toBe(3) // đặt hàng + xác nhận + đang giao

    // Dùng id của A nhưng thao tác bằng userId của B: không đánh dấu được gì.
    expect(await markNotificationsRead(b.buyer.user.id, { ids: [mine.items[0].id] })).toBe(0)
    expect((await listNotifications(a.buyer.user.id)).unread).toBe(3)

    expect(await markNotificationsRead(a.buyer.user.id, { ids: [mine.items[0].id] })).toBe(1)
    expect((await listNotifications(a.buyer.user.id)).unread).toBe(2)

    expect(await markNotificationsRead(a.buyer.user.id)).toBe(2)
    const after = await listNotifications(a.buyer.user.id)
    expect(after.unread).toBe(0)
    expect(after.items.every((i) => i.read)).toBe(true)
    expect((await listNotifications(b.buyer.user.id)).unread).toBe(2) // đặt hàng + xác nhận
  })

  it("input sai bị từ chối", async () => {
    const { buyer } = await placeOrder()
    await expect(markNotificationsRead(buyer.user.id, { ids: "không phải mảng" })).rejects.toThrow()
    expect((await listNotifications(buyer.user.id)).unread).toBe(1) // vẫn chưa đọc, không bị đánh dấu nhầm
  })
})

describe("trang đầy đủ", () => {
  it("phân trang, trang ngoài phạm vi về trang cuối, chỉ thấy thông báo của mình", async () => {
    const { buyer } = await placeOrder()
    const rows = Array.from({ length: NOTIFICATION_PAGE_SIZE + 3 }, (_, i) => ({
      userId: buyer.user.id,
      type: "ORDER_STATUS" as const,
      title: `Thử ${i}`,
      createdAt: new Date(Date.now() - (i + 1) * 60_000),
    }))
    await db.notification.createMany({ data: rows })

    const first = await listNotificationsPage(buyer.user.id, 1)
    expect(first.total).toBe(NOTIFICATION_PAGE_SIZE + 4) // + thông báo đặt hàng
    expect(first.pageCount).toBe(2)
    expect(first.items).toHaveLength(NOTIFICATION_PAGE_SIZE)
    expect(first.items[0].title).toContain("Đặt hàng thành công") // mới nhất

    const last = await listNotificationsPage(buyer.user.id, 99)
    expect(last.page).toBe(2)
    expect(last.items).toHaveLength(4)

    const other = await fx.makeAdmin()
    expect(await listNotificationsPage(other.id, 1)).toMatchObject({ total: 0, page: 1, pageCount: 1, items: [] })
  })
})
