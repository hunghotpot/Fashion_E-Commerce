import "server-only"
import type { Prisma, PrismaClient } from "@prisma/client"
import { CUSTOMER_TIERS, customerTier, freeShippingThresholdFor, nextTier, type CustomerTier } from "@/lib/customer-tier"
import { calculateShippingFee } from "@/lib/shipping"
import { db } from "@/server/db"
import { getShopSettings } from "./shop-settings.service"

/*
 * Tổng chi tiêu của khách (cơ sở tính hạng thành viên): chỉ đơn ĐÃ THANH TOÁN (paymentStatus PAID) hoặc ĐÃ GIAO,
 * loại đơn huỷ. Đơn vừa đặt còn chờ thanh toán chưa được tính nên không nâng hạng được bằng đơn ảo.
 */
export const PAID_SPEND_WHERE: Prisma.OrderWhereInput = {
  status: { not: "CANCELLED" },
  OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
}

export async function getCustomerSpend(userId: string, client: Pick<PrismaClient, "order"> = db): Promise<number> {
  const agg = await client.order.aggregate({ where: { userId, ...PAID_SPEND_WHERE }, _sum: { total: true } })
  return agg._sum.total ?? 0
}

/** Ngưỡng miễn phí vận chuyển áp cho khách này (theo hạng hiện tại, ngưỡng hạng lấy từ ShopSettings). Truyền `client` để chạy trong transaction. */
export async function getShippingTerms(
  userId: string,
  client: Pick<PrismaClient, "order" | "shopSettings"> = db
): Promise<{ freeShippingThreshold: number; flatShippingFee: number }> {
  const { tiers, flatShippingFee } = await getShopSettings(client)
  return { freeShippingThreshold: freeShippingThresholdFor(customerTier(await getCustomerSpend(userId, client), tiers), tiers), flatShippingFee }
}

/** Phí vận chuyển của đơn có tiền hàng `subtotal` cho khách này (ngưỡng theo hạng, phí đồng giá từ ShopSettings). */
export async function getShippingFee(userId: string, subtotal: number, client: Pick<PrismaClient, "order" | "shopSettings"> = db): Promise<number> {
  const { freeShippingThreshold, flatShippingFee } = await getShippingTerms(userId, client)
  return calculateShippingFee(subtotal, freeShippingThreshold, flatShippingFee)
}

/** Tổng chi tiêu cho một nhóm khách, một câu truy vấn gom (không N+1). Khách chưa có đơn tính hợp lệ không có trong Map. */
export async function getCustomerSpendMap(userIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (userIds.length === 0) return map
  const rows = await db.order.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, ...PAID_SPEND_WHERE },
    _sum: { total: true },
  })
  for (const r of rows) map.set(r.userId, r._sum.total ?? 0)
  return map
}

/**
 * Điều kiện lọc khách thuộc đúng một hạng, dùng trong `where` của User. Hạng MEMBER là phần bù (kể cả khách chưa có đơn),
 * các hạng khác lấy theo khoảng chi tiêu [minSpend, minSpend của hạng kế tiếp).
 */
export async function customerIdFilterForTier(tier: CustomerTier): Promise<Prisma.UserWhereInput> {
  const { tiers } = await getShopSettings()
  const next = nextTier(tier)
  const min = tiers[tier].minSpend
  if (tier === "MEMBER") {
    const firstAbove = CUSTOMER_TIERS[1]
    const rows = await db.order.groupBy({
      by: ["userId"],
      where: { ...PAID_SPEND_WHERE, user: { role: "CUSTOMER" } },
      _sum: { total: true },
      having: { total: { _sum: { gte: tiers[firstAbove].minSpend } } },
    })
    return { id: { notIn: rows.map((r) => r.userId) } }
  }
  const rows = await db.order.groupBy({
    by: ["userId"],
    where: { ...PAID_SPEND_WHERE, user: { role: "CUSTOMER" } },
    _sum: { total: true },
    having: { total: { _sum: next ? { gte: min, lt: tiers[next].minSpend } : { gte: min } } },
  })
  return { id: { in: rows.map((r) => r.userId) } }
}
