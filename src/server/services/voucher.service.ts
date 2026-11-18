import "server-only"
import type { Prisma, Voucher } from "@prisma/client"
import { z } from "zod"
import {
  computeVoucherDiscount,
  describeVoucherBenefit,
  voucherSlot,
  voucherStubLabel,
  type AvailableVoucher,
  type MyVoucher,
  type MyVouchers,
  normalizeVoucherCode,
  VOUCHER_PAYMENT_METHODS,
  type VoucherPreview,
} from "@/lib/voucher"
import { formatVnd } from "@/lib/format"
import { orderSourceSchema } from "@/lib/order-source"
import { CUSTOMER_TIER_LABEL, CUSTOMER_TIERS, customerTier, tierAtLeast } from "@/lib/customer-tier"
import { db } from "@/server/db"
import { getCustomerSpend, getShippingFee } from "@/server/services/customer-spend"
import { getShopSettings } from "@/server/services/shop-settings.service"
import { loadOrderLines } from "@/server/services/order-lines"

/*
 * Voucher phía khách: kiểm tra điều kiện và tính số tiền giảm. Hàm nhận `user` làm tham số (không đọc cookie).
 * `resolveVoucher` được dùng cả khi xem trước (giỏ/thanh toán) và khi đặt đơn (trong transaction), nên hai nơi luôn khớp.
 * Số tiền giảm luôn do server tính lại; client không bao giờ gửi số tiền.
 */

export type VoucherErrorCode =
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "NO_ELIGIBLE_ITEMS"
  | "MIN_ORDER"
  | "FIRST_ORDER_ONLY"
  | "ALREADY_USED"
  | "PAYMENT_METHOD"
  | "SLOT_CONFLICT"
  | "TIER_REQUIRED"

export class VoucherError extends Error {
  constructor(
    public readonly code: VoucherErrorCode,
    message: string
  ) {
    super(message)
    this.name = "VoucherError"
  }
}

type Client = Prisma.TransactionClient

export interface VoucherLine {
  categoryId: string
  /** Đơn giá × số lượng (VND). */
  lineTotal: number
}

export interface ResolvedVoucher {
  voucher: Voucher
  discount: number
}

export const voucherPreviewInputSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá").max(40, "Mã giảm giá không hợp lệ"),
  paymentMethod: z.string().max(20).optional(),
  /** Nguồn hàng đang thanh toán (cả giỏ, dòng giỏ được chọn, hoặc mua ngay): voucher phải tính trên đúng phần hàng đó. */
  source: orderSourceSchema.optional(),
})

/** Danh mục áp dụng = danh mục của voucher + danh mục con trực tiếp (cây tối đa 2 cấp). */
async function scopeCategoryIds(tx: Client, categoryId: string): Promise<Set<string>> {
  const children = await tx.category.findMany({ where: { parentId: categoryId }, select: { id: true } })
  return new Set([categoryId, ...children.map((c) => c.id)])
}

/**
 * Kiểm tra voucher theo thứ tự: tồn tại → bật → thời gian → còn lượt → hàng áp dụng → đơn tối thiểu → khách mới → đã dùng → thanh toán.
 * Ném VoucherError (thông báo tiếng Việt, hiển thị thẳng cho khách).
 */
export async function resolveVoucher(
  tx: Client,
  userId: string,
  rawCode: string,
  ctx: { lines: VoucherLine[]; shippingFee: number; paymentMethod?: string; now?: Date }
): Promise<ResolvedVoucher> {
  const now = ctx.now ?? new Date()
  const code = normalizeVoucherCode(rawCode)
  const voucher = await tx.voucher.findUnique({ where: { code } })
  if (!voucher) throw new VoucherError("NOT_FOUND", "Mã giảm giá không tồn tại")
  // Mã gán riêng: người không được gán nhận đúng thông báo "không tồn tại" như mã sai (không lộ mã có tồn tại).
  if (voucher.audience === "USERS" && (await tx.voucherAssignment.count({ where: { voucherId: voucher.id, userId } })) === 0) {
    throw new VoucherError("NOT_FOUND", "Mã giảm giá không tồn tại")
  }
  if (!voucher.isActive) throw new VoucherError("INACTIVE", "Mã giảm giá đã bị tắt")
  if (voucher.startsAt && voucher.startsAt > now) throw new VoucherError("NOT_STARTED", "Mã giảm giá chưa đến thời gian áp dụng")
  if (voucher.expiresAt && voucher.expiresAt < now) throw new VoucherError("EXPIRED", "Mã giảm giá đã hết hạn")
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    throw new VoucherError("EXHAUSTED", "Mã giảm giá đã hết lượt sử dụng")
  }
  if (voucher.audience === "TIER" && voucher.minTier && !tierAtLeast(customerTier(await getCustomerSpend(userId, tx), (await getShopSettings(tx)).tiers), voucher.minTier)) {
    throw new VoucherError("TIER_REQUIRED", `Mã này dành cho hạng ${CUSTOMER_TIER_LABEL[voucher.minTier]} trở lên`)
  }

  let eligible = ctx.lines
  if (voucher.categoryId) {
    const ids = await scopeCategoryIds(tx, voucher.categoryId)
    eligible = ctx.lines.filter((l) => ids.has(l.categoryId))
    if (eligible.length === 0) {
      throw new VoucherError("NO_ELIGIBLE_ITEMS", "Giỏ hàng chưa có sản phẩm thuộc danh mục được áp dụng mã này")
    }
  }
  const eligibleSubtotal = eligible.reduce((s, l) => s + l.lineTotal, 0)
  if (eligibleSubtotal < voucher.minOrder) {
    throw new VoucherError("MIN_ORDER", `Đơn hàng cần từ ${formatVnd(voucher.minOrder)} để dùng mã này`)
  }

  if (voucher.firstOrderOnly) {
    const previous = await tx.order.count({ where: { userId, status: { not: "CANCELLED" } } })
    if (previous > 0) throw new VoucherError("FIRST_ORDER_ONLY", "Mã này chỉ dành cho đơn hàng đầu tiên")
  }
  const used = await tx.voucherRedemption.count({ where: { voucherId: voucher.id, userId } })
  if (used > 0) throw new VoucherError("ALREADY_USED", "Bạn đã dùng mã giảm giá này rồi")

  if (ctx.paymentMethod !== undefined && !VOUCHER_PAYMENT_METHODS.includes(ctx.paymentMethod)) {
    throw new VoucherError("PAYMENT_METHOD", "Mã giảm giá hiện chỉ áp dụng khi thanh toán khi nhận hàng (COD) hoặc chuyển khoản")
  }

  if (voucher.type === "FREESHIP" && ctx.shippingFee <= 0) {
    throw new VoucherError("NO_ELIGIBLE_ITEMS", "Đơn hàng đã được miễn phí vận chuyển")
  }
  const discount = computeVoucherDiscount(voucher, eligibleSubtotal, ctx.shippingFee)
  if (discount <= 0) throw new VoucherError("NO_ELIGIBLE_ITEMS", "Mã giảm giá không áp dụng được cho đơn hàng này")
  return { voucher, discount }
}

export interface ResolvedVoucherSet {
  /** Mã giảm giá (CASH/PERCENT) trừ vào tiền hàng. */
  product: ResolvedVoucher | null
  /** Mã vận chuyển (FREESHIP) trừ vào phí ship. */
  shipping: ResolvedVoucher | null
}

/**
 * Kiểm tra tối đa HAI mã cùng lúc: một mã giảm giá + một mã vận chuyển. Hai mã cùng nhóm (hoặc cùng một mã hai lần) bị từ chối
 * để khách biết chọn một. Mỗi mã được kiểm độc lập trên cùng phần hàng và phí ship.
 */
export async function resolveVoucherSet(
  tx: Client,
  userId: string,
  rawCodes: string[],
  ctx: { lines: VoucherLine[]; shippingFee: number; paymentMethod?: string; now?: Date }
): Promise<ResolvedVoucherSet> {
  const codes = [...new Set(rawCodes.map(normalizeVoucherCode).filter(Boolean))]
  const out: ResolvedVoucherSet = { product: null, shipping: null }
  for (const code of codes) {
    const resolved = await resolveVoucher(tx, userId, code, ctx)
    const slot = voucherSlot(resolved.voucher.type)
    const key = slot === "SHIPPING" ? "shipping" : "product"
    if (out[key]) {
      throw new VoucherError("SLOT_CONFLICT", `Mỗi đơn chỉ dùng một ${slot === "SHIPPING" ? "mã vận chuyển" : "mã giảm giá"}`)
    }
    out[key] = resolved
  }
  return out
}

/**
 * Tăng số lượt dùng một cách nguyên tử: câu UPDATE kèm điều kiện còn lượt, nên hai đơn cùng lúc không vượt hạn mức.
 * Gọi TRONG transaction đặt đơn.
 */
export async function consumeVoucher(tx: Client, voucherId: string): Promise<void> {
  const changed = await tx.$executeRaw`
    UPDATE "Voucher" SET "usedCount" = "usedCount" + 1
    WHERE "id" = ${voucherId} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`
  if (changed === 0) throw new VoucherError("EXHAUSTED", "Mã giảm giá đã hết lượt sử dụng")
}

/** Hoàn lượt dùng khi đơn bị huỷ (gọi trong transaction huỷ). Không có voucher thì không làm gì. */
export async function releaseVoucher(tx: Client, orderId: string): Promise<void> {
  const redemptions = await tx.voucherRedemption.findMany({ where: { orderId }, select: { id: true, voucherId: true } })
  for (const r of redemptions) {
    await tx.voucherRedemption.delete({ where: { id: r.id } })
    await tx.$executeRaw`UPDATE "Voucher" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "id" = ${r.voucherId}`
  }
}

/** Xem trước voucher trên giỏ hiện tại của user (không ghi gì). */
export async function previewVoucher(user: { id: string }, input: unknown): Promise<VoucherPreview> {
  const { code, paymentMethod, source } = voucherPreviewInputSchema.parse(input)
  const loaded = await loadOrderLines(db, user.id, source)
  const lines: VoucherLine[] = loaded.ok
    ? loaded.lines.filter((l) => l.variant.product.isActive).map((l) => ({ categoryId: l.variant.product.categoryId, lineTotal: l.variant.price * l.quantity }))
    : []
  if (lines.length === 0) throw new VoucherError("NO_ELIGIBLE_ITEMS", "Chưa có sản phẩm nào để áp mã giảm giá")

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0)
  const { voucher, discount } = await resolveVoucher(db, user.id, code, {
    lines,
    shippingFee: await getShippingFee(user.id, subtotal),
    paymentMethod,
  })
  return { code: voucher.code, slot: voucherSlot(voucher.type), name: voucher.name, benefit: describeVoucherBenefit(voucher), discount }
}

const availableInputSchema = z.object({
  paymentMethod: z.string().max(20).optional(),
  source: orderSourceSchema.optional(),
})

// Lý do không bao giờ giúp khách dùng được mã này nữa → không liệt kê (khác với "chưa đủ điều kiện", còn cách để dùng).
const HIDDEN_REASONS: readonly VoucherErrorCode[] = ["NOT_FOUND", "INACTIVE", "NOT_STARTED", "EXPIRED", "EXHAUSTED", "ALREADY_USED", "FIRST_ORDER_ONLY"]
const AVAILABLE_LIMIT = 20

/**
 * Voucher "dành cho bạn" dưới ô nhập mã: các voucher đang chạy mà khách chưa dùng, kèm kết quả kiểm tra trên đúng phần hàng đang thanh toán.
 * Dùng được thì có `discount`; chưa dùng được thì có `reason` (chưa đủ đơn tối thiểu, sai phương thức thanh toán, sai danh mục...).
 * Dùng được xếp trước, giảm nhiều nhất lên đầu; hiện mọi voucher là công khai nên "của bạn" = chưa dùng và còn hiệu lực (chưa có voucher gán riêng).
 */
export async function listAvailableVouchers(user: { id: string }, input: unknown): Promise<AvailableVoucher[]> {
  const { paymentMethod, source } = availableInputSchema.parse(input ?? {})
  const loaded = await loadOrderLines(db, user.id, source)
  if (!loaded.ok) return []
  const lines: VoucherLine[] = loaded.lines
    .filter((l) => l.variant.product.isActive)
    .map((l) => ({ categoryId: l.variant.product.categoryId, lineTotal: l.variant.price * l.quantity }))
  if (lines.length === 0) return []
  const shippingFee = await getShippingFee(user.id, lines.reduce((s, l) => s + l.lineTotal, 0))

  await syncTierPerks(user.id) // khách vừa lên hạng thì nhận voucher chào mừng ngay trong danh sách này
  const now = new Date()
  const candidates = await db.voucher.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        // Mã gán riêng chỉ hiện cho người được gán; mã theo hạng hiện cho mọi khách (chưa đủ hạng thì kèm lý do).
        { OR: [{ audience: { in: ["ALL", "TIER"] } }, { audience: "USERS", assignments: { some: { userId: user.id } } }] },
      ],
      redemptions: { none: { userId: user.id } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: AVAILABLE_LIMIT + 10,
  })

  const out: AvailableVoucher[] = []
  for (const v of candidates) {
    if (v.usageLimit !== null && v.usedCount >= v.usageLimit) continue
    const base = {
      code: v.code,
      slot: voucherSlot(v.type),
      name: v.name,
      benefit: describeVoucherBenefit(v),
      type: v.type,
      stub: voucherStubLabel(v),
      condition: v.minOrder > 0 ? `Đơn từ ${formatVnd(v.minOrder)}` : "",
      expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
    }
    try {
      const { discount } = await resolveVoucher(db, user.id, v.code, { lines, shippingFee, paymentMethod, now })
      out.push({ ...base, eligible: true, discount })
    } catch (e) {
      if (!(e instanceof VoucherError)) throw e
      if (HIDDEN_REASONS.includes(e.code)) continue
      out.push({ ...base, eligible: false, discount: 0, reason: e.message })
    }
  }

  out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.discount - a.discount)
  // "Tiết kiệm nhất" tính riêng từng nhóm (giảm giá / vận chuyển), vì hai nhóm dùng được cùng lúc.
  for (const slot of ["PRODUCT", "SHIPPING"] as const) {
    const eligible = out.filter((v) => v.eligible && v.slot === slot)
    if (eligible.length >= 2) eligible[0].best = true
  }
  return out.slice(0, AVAILABLE_LIMIT)
}

/**
 * Tự cấp voucher chào mừng khi khách đạt hạng: mọi voucher còn hiệu lực có `welcomeTier` ≤ hạng hiện tại mà khách chưa được gán
 * thì gán ngay (kèm thông báo cho khách). Idempotent và an toàn khi chạy đồng thời: chỉ lần gán đầu tiên tạo thông báo.
 * Gọi lười khi khách mở giỏ/"Voucher của tôi" và sau mỗi đơn chuyển sang đã thanh toán/đã giao.
 */
export async function syncTierPerks(userId: string): Promise<{ granted: string[] }> {
  const tier = customerTier(await getCustomerSpend(userId), (await getShopSettings()).tiers)
  const reached = CUSTOMER_TIERS.filter((t) => tierAtLeast(tier, t))
  const now = new Date()
  const vouchers = await db.voucher.findMany({
    where: {
      welcomeTier: { in: reached },
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      assignments: { none: { userId } },
    },
    select: { id: true, code: true, name: true, welcomeTier: true },
    orderBy: { createdAt: "asc" },
  })
  if (vouchers.length === 0) return { granted: [] }

  const granted: string[] = []
  await db.$transaction(async (tx) => {
    for (const v of vouchers) {
      const r = await tx.voucherAssignment.createMany({ data: [{ voucherId: v.id, userId, auto: true }], skipDuplicates: true })
      if (r.count !== 1) continue
      granted.push(v.code)
      await tx.notification.create({
        data: {
          userId,
          type: "VOUCHER",
          title: `Bạn nhận được voucher ${v.code}`,
          body: `Quà hạng ${CUSTOMER_TIER_LABEL[v.welcomeTier!]}: ${v.name}`,
          href: "/account/vouchers",
        },
      })
    }
  })
  return { granted }
}

/** Như `syncTierPerks` nhưng theo đơn hàng, dùng sau khi commit; không bao giờ ném lỗi để không làm hỏng luồng đơn hàng. */
export async function syncTierPerksForOrder(orderId: string): Promise<void> {
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, select: { userId: true } })
    if (order) await syncTierPerks(order.userId)
  } catch (e) {
    console.error("syncTierPerksForOrder failed", e)
  }
}

const MY_VOUCHER_LIMIT = 200

/**
 * Trang "Voucher của tôi": mọi voucher khách có thể thấy, chia ba nhóm. Công khai + theo hạng + được gán riêng + đã dùng.
 * Dùng được xếp theo hạn dùng gần nhất trước; voucher theo hạng chưa đủ hạng nằm cuối nhóm "dùng được", kèm lý do.
 * Voucher đã tắt hoặc chưa đến ngày bắt đầu thì không hiện (trừ voucher khách đã dùng).
 */
export async function listMyVouchers(userId: string): Promise<MyVouchers> {
  await syncTierPerks(userId) // vừa lên hạng thì nhận voucher chào mừng ngay trong lần xem này
  const tier = customerTier(await getCustomerSpend(userId), (await getShopSettings()).tiers)
  const now = new Date()
  const rows = await db.voucher.findMany({
    where: {
      OR: [
        { audience: { in: ["ALL", "TIER"] } },
        { audience: "USERS", assignments: { some: { userId } } },
        { redemptions: { some: { userId } } },
      ],
    },
    include: { redemptions: { where: { userId }, select: { createdAt: true, order: { select: { code: true } } } } },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: MY_VOUCHER_LIMIT,
  })

  const out: MyVouchers = { usable: [], used: [], expired: [] }
  const locked: MyVoucher[] = []
  for (const v of rows) {
    const base: MyVoucher = {
      code: v.code,
      name: v.name,
      slot: voucherSlot(v.type),
      type: v.type,
      benefit: describeVoucherBenefit(v),
      stub: voucherStubLabel(v),
      condition: v.minOrder > 0 ? `Đơn từ ${formatVnd(v.minOrder)}` : "",
      expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
      audienceLabel:
        v.audience === "USERS"
          ? v.welcomeTier
            ? `Quà hạng ${CUSTOMER_TIER_LABEL[v.welcomeTier]}`
            : "Cấp riêng cho bạn"
          : v.audience === "TIER" && v.minTier
            ? `Từ hạng ${CUSTOMER_TIER_LABEL[v.minTier]}`
            : null,
    }
    const redemption = v.redemptions[0]
    if (redemption) {
      out.used.push({ ...base, usedAt: redemption.createdAt.toISOString(), orderCode: redemption.order.code })
    } else if (!v.isActive || (v.startsAt && v.startsAt > now)) {
      continue
    } else if (v.expiresAt && v.expiresAt < now) {
      out.expired.push({ ...base, expiredReason: "Hết hạn" })
    } else if (v.usageLimit !== null && v.usedCount >= v.usageLimit) {
      out.expired.push({ ...base, expiredReason: "Hết lượt" })
    } else if (v.audience === "TIER" && v.minTier && !tierAtLeast(tier, v.minTier)) {
      locked.push({ ...base, locked: `Dành cho hạng ${CUSTOMER_TIER_LABEL[v.minTier]} trở lên` })
    } else {
      out.usable.push(base)
    }
  }

  const byExpiryAsc = (a: MyVoucher, b: MyVoucher) =>
    (a.expiresAt ?? "9999").localeCompare(b.expiresAt ?? "9999") || a.code.localeCompare(b.code)
  out.usable.sort(byExpiryAsc)
  locked.sort(byExpiryAsc)
  out.usable.push(...locked)
  out.used.sort((a, b) => (b.usedAt ?? "").localeCompare(a.usedAt ?? ""))
  out.expired.sort((a, b) => (b.expiresAt ?? "").localeCompare(a.expiresAt ?? ""))
  return out
}
