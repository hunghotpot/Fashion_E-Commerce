import "server-only"
import type { OrderActorType, OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client"
import {
  adminCancelOrderSchema,
  adminChangeOrderStatusSchema,
  adminOrderIdSchema,
  adminOrderListFilterSchema,
  type AdminOrderListFilterInput,
} from "@/lib/validators/admin-order"
import { db } from "@/server/db"
import { notifyPaymentConfirmed } from "@/server/services/notification.service"
import { sendOrderEmail } from "@/server/services/order-email.service"
import { syncTierPerksForOrder } from "@/server/services/voucher.service"
import {
  cancelOrderCore,
  changeOrderStatus,
  OrderError,
  recordStatusChange,
  type OrderActor,
} from "@/server/services/order.service"
import type { OrderAddressSnapshot } from "@/types/order"

/*
 * Đơn hàng cho Admin. Service KHÔNG kiểm quyền: Server Action/route phải gọi requireAdmin() trước rồi truyền
 * `admin: { userId }` vào đây để ghi lịch sử. Mọi thay đổi trạng thái/tồn kho chạy trong transaction của order.service.
 * Nhãn "Đang đóng gói" trên Admin = CONFIRMED.
 */

export type AdminActor = { userId: string }

const adminActor = (admin: AdminActor): OrderActor => ({ type: "ADMIN", userId: admin.userId })

// ───────────────────────────── Danh sách ─────────────────────────────

export interface AdminOrderListItem {
  id: string
  code: string
  createdAt: Date
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  /** Lúc khách báo đã chuyển khoản (null = chưa báo). */
  customerReportedPaidAt: Date | null
  total: number
  customerName: string
  /** SĐT tài khoản, thiếu thì lấy SĐT trên địa chỉ giao hàng. */
  customerPhone: string | null
  firstProductName: string
  /** Số dòng hàng còn lại sau sản phẩm đầu ("+N món"). */
  otherLines: number
  quantity: number
}

export interface AdminOrderListResult {
  items: AdminOrderListItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

/** Đơn chuyển khoản đang chờ Admin xác nhận đã nhận tiền. */
const AWAITING_TRANSFER_WHERE = {
  paymentMethod: "BANK_TRANSFER",
  paymentStatus: "PENDING",
  status: { not: "CANCELLED" },
} satisfies Prisma.OrderWhereInput

export function countAwaitingTransfer(): Promise<number> {
  return db.order.count({ where: AWAITING_TRANSFER_WHERE })
}

/** Danh sách mọi đơn của mọi khách, mới nhất trước. Tìm theo mã đơn / tên khách / SĐT. */
export async function listAllOrders(input: AdminOrderListFilterInput = {}): Promise<AdminOrderListResult> {
  const f = adminOrderListFilterSchema.parse(input)
  const q = f.q?.replace(/^#/, "").trim()

  const where: Prisma.OrderWhereInput = {
    ...(f.awaiting === "transfer"
      ? AWAITING_TRANSFER_WHERE
      : {
          ...(f.status ? { status: f.status } : {}),
          ...(f.paymentStatus ? { paymentStatus: f.paymentStatus } : {}),
          ...(f.paymentMethod ? { paymentMethod: f.paymentMethod } : {}),
        }),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { phone: { contains: q } } },
            { shippingAddress: { path: ["fullName"], string_contains: q } },
            { shippingAddress: { path: ["phone"], string_contains: q } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      // Lọc "chờ xác nhận chuyển khoản": đơn khách đã báo chuyển khoản lên đầu để Admin đối soát trước.
      orderBy:
        f.awaiting === "transfer"
          ? [{ customerReportedPaidAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }]
          : [{ createdAt: "desc" }, { id: "asc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      select: {
        id: true,
        code: true,
        createdAt: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        customerReportedPaidAt: true,
        total: true,
        shippingAddress: true,
        user: { select: { name: true, phone: true } },
        items: { orderBy: { id: "asc" }, select: { productName: true, quantity: true } },
      },
    }),
    db.order.count({ where }),
  ])

  const items: AdminOrderListItem[] = rows.map((o) => {
    const addr = o.shippingAddress as unknown as Partial<OrderAddressSnapshot> | null
    return {
      id: o.id,
      code: o.code,
      createdAt: o.createdAt,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      customerReportedPaidAt: o.customerReportedPaidAt,
      total: o.total,
      customerName: o.user.name,
      customerPhone: o.user.phone ?? addr?.phone ?? null,
      firstProductName: o.items[0]?.productName ?? "—",
      otherLines: Math.max(o.items.length - 1, 0),
      quantity: o.items.reduce((sum, i) => sum + i.quantity, 0),
    }
  })

  return { items, total, page: f.page, pageSize: f.pageSize, pageCount: Math.max(1, Math.ceil(total / f.pageSize)) }
}

// ───────────────────────────── Thẻ số liệu ─────────────────────────────

export interface AdminOrderStatusCounts {
  ALL: number
  PENDING: number
  CONFIRMED: number
  SHIPPING: number
  DELIVERED: number
  CANCELLED: number
  /** Số đơn chuyển sang DELIVERED trong tháng hiện tại (giờ Việt Nam). */
  deliveredThisMonth: number
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000 // Asia/Ho_Chi_Minh = UTC+7, không có giờ mùa hè

/** [đầu tháng, đầu tháng sau) theo giờ Việt Nam, tính ra instant UTC. */
export function vnMonthRange(now: Date): { start: Date; end: Date } {
  const local = new Date(now.getTime() + VN_OFFSET_MS) // đọc bằng getUTC* để lấy giờ VN
  const y = local.getUTCFullYear()
  const m = local.getUTCMonth()
  return {
    start: new Date(Date.UTC(y, m, 1) - VN_OFFSET_MS),
    end: new Date(Date.UTC(y, m + 1, 1) - VN_OFFSET_MS),
  }
}

/** Số đơn theo trạng thái + số đơn hoàn thành trong tháng, cho 4 thẻ đầu trang. `now` chỉ để test. */
export async function getOrderStatusCounts(now: Date = new Date()): Promise<AdminOrderStatusCounts> {
  const { start, end } = vnMonthRange(now)
  const [grouped, deliveredThisMonth] = await Promise.all([
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.orderStatusHistory.count({ where: { toStatus: "DELIVERED", createdAt: { gte: start, lt: end } } }),
  ])

  const counts: AdminOrderStatusCounts = {
    ALL: 0,
    PENDING: 0,
    CONFIRMED: 0,
    SHIPPING: 0,
    DELIVERED: 0,
    CANCELLED: 0,
    deliveredThisMonth,
  }
  for (const g of grouped) {
    counts[g.status] = g._count._all
    counts.ALL += g._count._all
  }
  return counts
}

// ───────────────────────────── Chi tiết ─────────────────────────────

export interface AdminOrderDetail {
  id: string
  code: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  createdAt: Date
  customerReportedPaidAt: Date | null
  subtotal: number
  shippingFee: number
  discount: number
  voucherCode: string | null
  shippingDiscount: number
  shippingVoucherCode: string | null
  total: number
  note: string | null
  shippingAddress: OrderAddressSnapshot
  customer: { id: string; name: string; email: string; phone: string | null }
  items: {
    productName: string
    sku: string
    size: string
    color: string
    unitPrice: number
    quantity: number
    lineTotal: number
  }[]
  history: {
    fromStatus: OrderStatus | null
    toStatus: OrderStatus
    actorType: OrderActorType
    actorName: string | null
    note: string | null
    createdAt: Date
  }[]
}

/** Chi tiết đơn bất kỳ (không ràng userId). null nếu không tồn tại. Không trả passwordHash. */
export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const id = adminOrderIdSchema.parse(orderId)
  const row = await db.order.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      createdAt: true,
      customerReportedPaidAt: true,
      subtotal: true,
      shippingFee: true,
      discount: true,
      voucherCode: true,
      shippingDiscount: true,
      shippingVoucherCode: true,
      total: true,
      note: true,
      shippingAddress: true,
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: {
        orderBy: { id: "asc" },
        select: { productName: true, sku: true, size: true, color: true, unitPrice: true, quantity: true },
      },
      statusHistory: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          fromStatus: true,
          toStatus: true,
          actorType: true,
          note: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
    },
  })
  if (!row) return null

  return {
    id: row.id,
    code: row.code,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    createdAt: row.createdAt,
    customerReportedPaidAt: row.customerReportedPaidAt,
    subtotal: row.subtotal,
    shippingFee: row.shippingFee,
    discount: row.discount,
    voucherCode: row.voucherCode,
    shippingDiscount: row.shippingDiscount,
    shippingVoucherCode: row.shippingVoucherCode,
    total: row.total,
    note: row.note,
    shippingAddress: row.shippingAddress as unknown as OrderAddressSnapshot,
    customer: row.user,
    items: row.items.map((i) => ({ ...i, lineTotal: i.unitPrice * i.quantity })),
    history: row.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      actorType: h.actorType,
      actorName: h.actorType === "SYSTEM" ? null : (h.actor?.name ?? null),
      note: h.note,
      createdAt: h.createdAt,
    })),
  }
}

async function detailOrThrow(orderId: string): Promise<AdminOrderDetail> {
  const detail = await getAdminOrderDetail(orderId)
  if (!detail) throw new OrderError("ORDER_NOT_FOUND", "Không tìm thấy đơn hàng")
  return detail
}

// ───────────────────────────── Thao tác ─────────────────────────────

/** Admin huỷ đơn PENDING/CONFIRMED: hoàn kho, đơn đã PAID thành REFUNDED, ghi lịch sử actor ADMIN. */
export async function adminCancelOrder(admin: AdminActor, orderId: string, reason?: string): Promise<AdminOrderDetail> {
  const input = adminCancelOrderSchema.parse({ orderId, reason })
  await cancelOrderCore(input.orderId, { actor: adminActor(admin), note: input.reason ?? "Admin huỷ đơn" })
  return detailOrThrow(input.orderId)
}

/**
 * Admin chuyển đơn sang bước kế tiếp (Duyệt: PENDING→CONFIRMED, Giao đi: CONFIRMED→SHIPPING, DELIVERED).
 * Không nhảy cóc/đi lùi; chuyển sai ném INVALID_STATUS_CHANGE.
 */
export async function adminChangeOrderStatus(
  admin: AdminActor,
  orderId: string,
  to: "CONFIRMED" | "SHIPPING" | "DELIVERED",
  note?: string
): Promise<AdminOrderDetail> {
  const parsed = adminChangeOrderStatusSchema.safeParse({ orderId, to, note })
  if (!parsed.success) throw new OrderError("INVALID_STATUS_CHANGE", `Không thể chuyển đơn sang trạng thái ${String(to)}`)
  await changeOrderStatus(parsed.data.orderId, parsed.data.to, adminActor(admin), parsed.data.note)
  return detailOrThrow(parsed.data.orderId)
}

/**
 * Admin xác nhận đã nhận tiền chuyển khoản: chỉ đơn BANK_TRANSFER, paymentStatus PENDING, chưa huỷ.
 * Không idempotent: đơn đã PAID ném CANNOT_PAY (thông báo rõ) để Admin biết không có gì thay đổi.
 * Trạng thái đơn giữ nguyên; lịch sử ghi một dòng from = to kèm ghi chú. Khách được báo qua chuông (và email nếu bật).
 * Đơn chuyển khoản PENDING chưa trả tiền quá BANK_TRANSFER_WINDOW_HOURS sẽ tự huỷ (expireUnpaidBankTransferOrders).
 */
export async function markBankTransferPaid(admin: AdminActor, orderId: string): Promise<AdminOrderDetail> {
  const id = adminOrderIdSchema.parse(orderId)

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, select: { id: true } })
    if (!order) throw new OrderError("ORDER_NOT_FOUND", "Không tìm thấy đơn hàng")

    // Khoá dòng đơn: huỷ/đổi trạng thái đồng thời phải chờ, và trạng thái ghi vào lịch sử luôn đúng.
    const [locked] = await tx.$queryRaw<
      { status: OrderStatus; paymentMethod: PaymentMethod; paymentStatus: PaymentStatus }[]
    >`SELECT "status", "paymentMethod", "paymentStatus" FROM "Order" WHERE "id" = ${id} FOR UPDATE`

    if (locked.paymentMethod !== "BANK_TRANSFER") {
      throw new OrderError("CANNOT_PAY", "Chỉ xác nhận thanh toán thủ công cho đơn chuyển khoản")
    }
    if (locked.status === "CANCELLED") {
      throw new OrderError("CANNOT_PAY", "Đơn đã huỷ nên không thể xác nhận thanh toán")
    }
    if (locked.paymentStatus === "PAID") {
      throw new OrderError("CANNOT_PAY", "Đơn này đã được xác nhận thanh toán trước đó")
    }
    if (locked.paymentStatus !== "PENDING") {
      throw new OrderError("CANNOT_PAY", "Đơn không ở trạng thái chờ thanh toán")
    }

    await tx.order.update({ where: { id }, data: { paymentStatus: "PAID" } })
    await recordStatusChange(tx, id, locked.status, locked.status, adminActor(admin), "Admin xác nhận đã nhận tiền chuyển khoản")
    // Trạng thái đơn không đổi nên recordStatusChange không báo: báo riêng cho khách (chuông) trong cùng transaction.
    await notifyPaymentConfirmed(tx, id)
  })
  void syncTierPerksForOrder(id)
  void sendOrderEmail(id, "PENDING", "PAYMENT_CONFIRMED") // email (mặc định tắt) sau khi commit, không bao giờ làm hỏng thao tác

  return detailOrThrow(id)
}
