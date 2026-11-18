import type { Metadata } from "next"
import { StatCard, StatGrid } from "@/components/admin/dashboard/stat-card"
import { AdminPagination } from "@/components/admin/list/admin-pagination"
import { ListCard, ListSection } from "@/components/admin/list/admin-table"
import { ListToolbar } from "@/components/admin/list/list-toolbar"
import { CreateVoucherButton } from "@/components/admin/vouchers/voucher-form-modal"
import { VoucherTable } from "@/components/admin/vouchers/voucher-table"
import type { RawSearchParams } from "@/lib/admin-list"
import { formatVnd } from "@/lib/format"
import { listCategoriesTree } from "@/server/services/admin-category.service"
import { listVouchers } from "@/server/services/admin-voucher.service"

export const metadata: Metadata = { title: "Voucher & Khuyến mãi" }

const FILTERS = [
  { value: "active", label: "Đang kích hoạt" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "expired", label: "Đã hết hạn" },
  { value: "disabled", label: "Đã tắt" },
]

function first(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v) ?? ""
}

export default async function AdminVouchersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams
  const [list, tree] = await Promise.all([
    listVouchers({ q: first(raw.q), status: first(raw.status), page: first(raw.page) }),
    listCategoriesTree(),
  ])
  // Danh mục cha trước, con thụt vào bằng tiền tố để dễ phân biệt trong ô chọn.
  const categories = tree.flatMap((c) => [{ value: c.id, label: c.name }, ...c.children.map((k) => ({ value: k.id, label: `${c.name} › ${k.name}` }))])
  const { stats } = list

  return (
    <>
      <StatGrid>
        <StatCard label="Voucher đang chạy" value={String(stats.activeCount)} unit="mã hoạt động" chip="Hiện tại" chipTone="success" />
        <StatCard label="Lượt đã áp dụng" value={stats.usedTotal.toLocaleString("vi-VN")} unit="lượt" chip="Đơn chưa huỷ" chipTone="info" />
        <StatCard label="Tổng tiền đã giảm" value={formatVnd(stats.discountTotal)} chip="Đơn chưa huỷ" chipTone="brand" accent />
        <StatCard label="Doanh số từ voucher" value={formatVnd(stats.revenueTotal)} chip="Đơn chưa huỷ" chipTone="success" />
      </StatGrid>

      <ListSection title="Danh Sách Mã Ưu Đãi">
        <ListToolbar placeholder="Tìm mã voucher, tên chương trình..." filters={FILTERS}>
          <CreateVoucherButton categories={categories} />
        </ListToolbar>
        <ListCard>
          <VoucherTable vouchers={list.rows} categories={categories} />
          <AdminPagination page={list.page} pageSize={list.pageSize} total={list.total} noun="mã khuyến mãi" basePath="/admin/vouchers" searchParams={raw} />
        </ListCard>
      </ListSection>
    </>
  )
}
