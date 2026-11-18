import { cn } from "@/lib/cn"
import { AdminEmpty, AdminTable, AdminTr } from "@/components/admin/list/admin-table"
import { StatusPill } from "@/components/admin/status-pill"
import { CUSTOMER_TIER_LABEL } from "@/lib/customer-tier"
import { formatVnd } from "@/lib/format"
import { describeVoucherBenefit, VOUCHER_STATUS_LABEL, VOUCHER_STATUS_TONE } from "@/lib/voucher"
import type { AdminVoucherRow } from "@/server/services/admin-voucher.service"
import type { CategoryOption } from "./voucher-form-modal"
import { VoucherRowActions } from "./voucher-row-actions"

const COLUMNS = [
  { label: "Mã code" },
  { label: "Chương trình & mức giảm" },
  { label: "Điều kiện áp dụng" },
  { label: "Đã dùng / Giới hạn" },
  { label: "Hạn dùng" },
  { label: "Trạng thái" },
  { label: "Thao tác", className: "text-right" },
]

const dateFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })

function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null) {
    return (
      <p className="min-w-32 font-semibold">
        {used.toLocaleString("vi-VN")} <span className="font-normal text-muted-foreground">/ không giới hạn</span>
      </p>
    )
  }
  const pct = Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="min-w-32">
      <p className="font-semibold">
        {used.toLocaleString("vi-VN")} / {limit.toLocaleString("vi-VN")}
      </p>
      <div role="progressbar" aria-label="Đã dùng" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-2 h-1.5 overflow-hidden rounded-none bg-secondary">
        <div className={cn("h-full rounded-none", pct >= 100 ? "bg-brand" : "bg-ink")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Ai dùng được mã: bỏ trống với mã công khai. */
function audienceText(v: AdminVoucherRow): string | null {
  if (v.audience === "TIER" && v.minTier) return `Từ hạng ${CUSTOMER_TIER_LABEL[v.minTier]}`
  if (v.audience === "USERS") {
    const parts = [v.assignedCount > 0 ? `${v.assignedCount.toLocaleString("vi-VN")} khách được gán` : null, v.welcomeTier ? `Tự cấp khi lên hạng ${CUSTOMER_TIER_LABEL[v.welcomeTier]}` : null]
    return parts.filter(Boolean).join(" · ") || "Chưa gán khách nào"
  }
  return null
}

function expiryText(v: AdminVoucherRow) {
  if (v.expiresAt) return dateFmt.format(v.expiresAt)
  return "Vô thời hạn"
}

export function VoucherTable({ vouchers, categories }: { vouchers: AdminVoucherRow[]; categories: CategoryOption[] }) {
  if (vouchers.length === 0) return <AdminEmpty title="Không có mã nào khớp bộ lọc." />
  return (
    <AdminTable columns={COLUMNS} minWidth={980} caption="Danh sách mã ưu đãi">
      {vouchers.map((v) => {
        const live = v.status === "ACTIVE"
        const scope = [v.categoryName ? `Danh mục: ${v.categoryName}` : "Toàn bộ sản phẩm", v.firstOrderOnly ? "Chỉ đơn đầu tiên" : null, audienceText(v)].filter(Boolean).join(" · ")
        return (
          <AdminTr key={v.id}>
            <td>
              <span className={cn("inline-block rounded-xl px-4 py-2 text-xs font-semibold", live ? "bg-ink text-white" : "bg-secondary text-foreground")}>{v.code}</span>
            </td>
            <td>
              <p className="font-semibold">{v.name}</p>
              <p className={cn("mt-1 text-xs font-semibold", v.type === "FREESHIP" ? "text-success" : "text-brand")}>{describeVoucherBenefit(v)}</p>
            </td>
            <td>
              <p className="font-semibold">{v.minOrder > 0 ? `Đơn từ ${formatVnd(v.minOrder)}` : "Không yêu cầu tối thiểu"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{scope}</p>
            </td>
            <td>
              <UsageBar used={v.usedCount} limit={v.usageLimit} />
            </td>
            <td className="whitespace-nowrap text-muted-foreground">
              {v.startsAt && v.status === "UPCOMING" ? `Từ ${dateFmt.format(v.startsAt)}` : expiryText(v)}
            </td>
            <td>
              <StatusPill tone={VOUCHER_STATUS_TONE[v.status]}>{VOUCHER_STATUS_LABEL[v.status]}</StatusPill>
            </td>
            <td className="text-right whitespace-nowrap">
              <VoucherRowActions voucher={v} categories={categories} />
            </td>
          </AdminTr>
        )
      })}
    </AdminTable>
  )
}
