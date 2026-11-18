import "server-only"
import { Prisma, type Voucher } from "@prisma/client"
import { adminContextSchema, adminIdSchema, type AdminContext } from "@/lib/validators/admin-catalog"
import { voucherInputSchema, voucherListQuerySchema, type VoucherData, type VoucherInput } from "@/lib/validators/admin-voucher"
import { voucherStatus, vnDayBoundary, type VoucherStatus } from "@/lib/voucher"
import { db } from "@/server/db"
import { AdminCatalogError, parseInput } from "./admin-catalog.service"

/*
 * Admin: quản lý voucher. Service không tự kiểm quyền (Server Action gọi getAdminUser() trước).
 * Không cho xoá voucher đã có lượt dùng (đơn cũ còn tham chiếu): chỉ tắt. Mã luôn IN HOA và duy nhất.
 */

export const VOUCHER_PAGE_SIZE = 8

export interface AdminVoucherRow extends Voucher {
  status: VoucherStatus
  categoryName: string | null
  /** Tổng số khách được gán (gồm cả tự cấp khi lên hạng). */
  assignedCount: number
  /** Khách Admin chọn tay (tối đa 50, để sửa trong form); khách tự cấp theo hạng không nằm ở đây. */
  assignedUsers: { id: string; name: string; email: string }[]
}

export interface AdminVoucherList {
  rows: AdminVoucherRow[]
  total: number
  page: number
  pageSize: number
  stats: { activeCount: number; usedTotal: number; discountTotal: number; revenueTotal: number }
}

function statusWhere(status: string, now: Date): Prisma.VoucherWhereInput {
  switch (status) {
    case "active":
      return { isActive: true, startsAt: { not: { gt: now } }, OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }
    case "upcoming":
      return { isActive: true, startsAt: { gt: now } }
    case "expired":
      return { isActive: true, expiresAt: { lt: now } }
    case "disabled":
      return { isActive: false }
    default:
      return {}
  }
}

/** Đọc danh sách (trang Admin đã được layout chặn người không phải admin, giống các màn danh sách khác). */
export async function listVouchers(rawQuery: unknown): Promise<AdminVoucherList> {
  const { q, status, page } = voucherListQuerySchema.parse(rawQuery)
  const now = new Date()

  const clauses: Prisma.VoucherWhereInput[] = []
  if (q) clauses.push({ OR: [{ code: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] })
  // `startsAt: { not: { gt } }` không biểu diễn được null; tách riêng để bộ lọc "active" gồm cả voucher không đặt ngày bắt đầu.
  if (status === "active") {
    clauses.push({ isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }] })
  } else if (status) {
    clauses.push(statusWhere(status, now))
  }
  const where: Prisma.VoucherWhereInput = clauses.length ? { AND: clauses } : {}

  const [total, activeCount, usage, orders] = await Promise.all([
    db.voucher.count({ where }),
    db.voucher.count({
      where: { isActive: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }] },
    }),
    db.voucher.aggregate({ _sum: { usedCount: true } }),
    db.order.aggregate({
      where: { OR: [{ voucherCode: { not: null } }, { shippingVoucherCode: { not: null } }], status: { not: "CANCELLED" } },
      _sum: { discount: true, shippingDiscount: true, total: true },
    }),
  ])
  const pageCount = Math.max(1, Math.ceil(total / VOUCHER_PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const vouchers = await db.voucher.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip: (current - 1) * VOUCHER_PAGE_SIZE,
    take: VOUCHER_PAGE_SIZE,
    include: {
      category: { select: { name: true } },
      _count: { select: { assignments: true } },
      assignments: { where: { auto: false }, take: 50, orderBy: { createdAt: "asc" }, select: { user: { select: { id: true, name: true, email: true } } } },
    },
  })

  return {
    rows: vouchers.map(({ category, _count, assignments, ...v }) => ({
      ...v,
      status: voucherStatus(v, now),
      categoryName: category?.name ?? null,
      assignedCount: _count.assignments,
      assignedUsers: assignments.map((a) => a.user),
    })),
    total,
    page: current,
    pageSize: VOUCHER_PAGE_SIZE,
    stats: {
      activeCount,
      usedTotal: usage._sum.usedCount ?? 0,
      discountTotal: (orders._sum.discount ?? 0) + (orders._sum.shippingDiscount ?? 0),
      revenueTotal: orders._sum.total ?? 0,
    },
  }
}

function toData(d: VoucherData) {
  return {
    code: d.code,
    name: d.name,
    type: d.type,
    value: d.value,
    maxDiscount: d.maxDiscount,
    minOrder: d.minOrder,
    categoryId: d.categoryId,
    firstOrderOnly: d.firstOrderOnly,
    usageLimit: d.usageLimit,
    startsAt: d.startsAt ? vnDayBoundary(d.startsAt, "start") : null,
    expiresAt: d.expiresAt ? vnDayBoundary(d.expiresAt, "end") : null,
    isActive: d.isActive,
    audience: d.audience,
    minTier: d.minTier,
    welcomeTier: d.welcomeTier,
  }
}

/** Các khách được gán phải tồn tại và là khách hàng (không phải Admin). */
async function assertCustomersExist(userIds: string[]) {
  if (userIds.length === 0) return
  const found = await db.user.count({ where: { id: { in: userIds }, role: "CUSTOMER" } })
  if (found !== userIds.length) throw new AdminCatalogError("INVALID_INPUT", "Có khách được chọn không tồn tại")
}

/**
 * Đồng bộ danh sách khách Admin gán tay (auto = false) với `userIds`: thêm khách mới, bỏ khách không còn trong danh sách.
 * Khách được tự cấp khi lên hạng (auto = true) không bị đụng, trừ khi voucher không còn là loại "khách cụ thể".
 */
async function syncManualAssignments(tx: Prisma.TransactionClient, voucherId: string, audience: string, userIds: string[]) {
  if (audience !== "USERS") {
    await tx.voucherAssignment.deleteMany({ where: { voucherId } })
    return
  }
  await tx.voucherAssignment.deleteMany({ where: { voucherId, auto: false, userId: { notIn: userIds } } })
  if (userIds.length) {
    await tx.voucherAssignment.createMany({ data: userIds.map((userId) => ({ voucherId, userId, auto: false })), skipDuplicates: true })
  }
}

async function assertCategoryExists(categoryId: string | null) {
  if (categoryId && !(await db.category.count({ where: { id: categoryId } }))) {
    throw new AdminCatalogError("CATEGORY_NOT_FOUND", "Danh mục áp dụng không tồn tại")
  }
}

function mapDuplicate(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new AdminCatalogError("VOUCHER_DUPLICATE_CODE", "Mã voucher đã tồn tại, hãy dùng mã khác")
  }
  throw e
}

export async function createVoucher(admin: AdminContext, input: VoucherInput): Promise<Voucher> {
  parseInput(adminContextSchema, admin)
  const data = parseInput(voucherInputSchema, input)
  await assertCategoryExists(data.categoryId)
  await assertCustomersExist(data.userIds)
  try {
    return await db.$transaction(async (tx) => {
      const created = await tx.voucher.create({ data: toData(data) })
      await syncManualAssignments(tx, created.id, data.audience, data.userIds)
      return created
    })
  } catch (e) {
    return mapDuplicate(e)
  }
}

export async function updateVoucher(admin: AdminContext, id: string, input: VoucherInput): Promise<Voucher> {
  parseInput(adminContextSchema, admin)
  const vid = parseInput(adminIdSchema, id)
  const data = parseInput(voucherInputSchema, input)
  await assertCategoryExists(data.categoryId)
  const current = await db.voucher.findUnique({ where: { id: vid }, select: { usedCount: true } })
  if (!current) throw new AdminCatalogError("VOUCHER_NOT_FOUND", "Voucher không tồn tại")
  if (data.usageLimit !== null && data.usageLimit < current.usedCount) {
    throw new AdminCatalogError("INVALID_INPUT", `Hạn mức không được nhỏ hơn số lượt đã dùng (${current.usedCount})`)
  }
  await assertCustomersExist(data.userIds)
  try {
    return await db.$transaction(async (tx) => {
      const updated = await tx.voucher.update({ where: { id: vid }, data: toData(data) })
      await syncManualAssignments(tx, vid, data.audience, data.userIds)
      return updated
    })
  } catch (e) {
    return mapDuplicate(e)
  }
}

export async function setVoucherActive(admin: AdminContext, id: string, isActive: boolean): Promise<void> {
  parseInput(adminContextSchema, admin)
  const vid = parseInput(adminIdSchema, id)
  const res = await db.voucher.updateMany({ where: { id: vid }, data: { isActive } })
  if (res.count === 0) throw new AdminCatalogError("VOUCHER_NOT_FOUND", "Voucher không tồn tại")
}

export async function deleteVoucher(admin: AdminContext, id: string): Promise<void> {
  parseInput(adminContextSchema, admin)
  const vid = parseInput(adminIdSchema, id)
  const v = await db.voucher.findUnique({ where: { id: vid }, select: { code: true, _count: { select: { redemptions: true } } } })
  if (!v) throw new AdminCatalogError("VOUCHER_NOT_FOUND", "Voucher không tồn tại")
  if (v._count.redemptions > 0) {
    throw new AdminCatalogError("VOUCHER_IN_USE", `Mã ${v.code} đã có đơn hàng sử dụng nên không xoá được. Hãy tắt mã thay vì xoá.`)
  }
  await db.voucher.delete({ where: { id: vid } })
}
