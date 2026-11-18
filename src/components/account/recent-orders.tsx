import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatDate, formatVnd } from "@/lib/format"
import type { OrderStatusValue, OrderSummary } from "@/types/order"

const STATUS: Record<OrderStatusValue, { label: string; variant: "warning" | "info" | "success" | "danger" }> = {
  PENDING: { label: "Chờ xác nhận", variant: "warning" },
  CONFIRMED: { label: "Đã xác nhận", variant: "info" },
  SHIPPING: { label: "Đang giao hàng", variant: "info" },
  DELIVERED: { label: "Hoàn thành", variant: "success" },
  CANCELLED: { label: "Đã hủy", variant: "danger" },
}

const TH = "px-6 py-4 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"

// Đơn hàng gần đây: hàng tiêu đề nền surface, mỗi đơn là một hàng bo viền.
export function RecentOrders({ orders }: { orders: OrderSummary[] }) {
  return (
    <section aria-labelledby="recent-orders" className="rounded-3xl border border-border bg-card p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 id="recent-orders" className="text-2xl font-semibold">
          Đơn hàng gần đây
        </h2>
        <Link href="/account/orders" className="inline-flex min-h-11 items-center text-xs font-semibold text-primary hover:underline">
          Xem tất cả đơn hàng →
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong px-6 py-12 text-center text-label text-muted-foreground">
          Bạn chưa có đơn hàng nào.
        </p>
      ) : (
        <>
          {/* Mobile: thẻ xếp dọc (bảng 640px làm trang tràn ngang). */}
          <ul className="space-y-3 md:hidden">
            {orders.map((o) => {
              const s = STATUS[o.status]
              return (
                <li key={o.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-label font-semibold">#{o.code}</p>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                  <p className="mt-2 text-label font-semibold">
                    {o.firstProductName}
                    {o.otherLines > 0 && ` (+${o.otherLines})`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(o.createdAt)} · {o.quantity} sản phẩm
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className={`text-label font-semibold ${o.status === "SHIPPING" ? "text-primary" : ""}`}>
                      {formatVnd(o.total)}
                    </span>
                    <Link href={`/account/orders/${o.id}`} className="inline-flex min-h-6 items-center text-xs font-semibold text-primary hover:underline pointer-coarse:min-h-11">
                      Chi tiết
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-3">
            <thead>
              <tr className="bg-surface">
                <th className={`${TH} rounded-l-xl`}>Mã đơn</th>
                <th className={TH}>Ngày đặt</th>
                <th className={TH}>Sản phẩm</th>
                <th className={TH}>Tổng tiền</th>
                <th className={TH}>Trạng thái</th>
                <th className={`${TH} rounded-r-xl`}>
                  <span className="sr-only">Chi tiết</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const s = STATUS[o.status]
                const cell = "border-y border-border bg-card px-6 py-5 text-label"
                return (
                  <tr key={o.id}>
                    <td className={`${cell} rounded-l-xl border-l font-semibold whitespace-nowrap`}>#{o.code}</td>
                    <td className={`${cell} whitespace-nowrap text-muted-foreground`}>{formatDate(o.createdAt)}</td>
                    <td className={cell}>
                      <p className="font-semibold">
                        {o.firstProductName}
                        {o.otherLines > 0 && ` (+${o.otherLines})`}
                      </p>
                      <p className="mt-1 text-xs text-subtle-foreground">{o.quantity} sản phẩm</p>
                    </td>
                    <td className={`${cell} font-semibold whitespace-nowrap ${o.status === "SHIPPING" ? "text-primary" : ""}`}>{formatVnd(o.total)}</td>
                    <td className={cell}>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td className={`${cell} rounded-r-xl border-r`}>
                      <Link href={`/account/orders/${o.id}`} className="text-xs font-semibold whitespace-nowrap hover:text-primary">
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  )
}



