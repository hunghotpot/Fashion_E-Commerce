import type { Metadata } from "next"
import { StatCard, StatGrid } from "@/components/admin/dashboard/stat-card"
import { AdminPagination } from "@/components/admin/list/admin-pagination"
import { ListCard, ListSection } from "@/components/admin/list/admin-table"
import { ListToolbar } from "@/components/admin/list/list-toolbar"
import { ReviewTable } from "@/components/admin/reviews/review-table"
import type { RawSearchParams } from "@/lib/admin-list"
import { requireAdmin } from "@/server/auth/session"
import { listAdminReviews } from "@/server/services/admin-review.service"

export const metadata: Metadata = { title: "Đánh giá sản phẩm" }

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireAdmin("/admin/reviews")
  const sp = await searchParams
  // Trang dùng ?status=visible|hidden; bộ lọc sai giá trị được Zod đưa về "tất cả".
  const list = await listAdminReviews(sp)

  const filters = [
    { value: "visible", label: `Đang hiện (${list.counts.visible})` },
    { value: "hidden", label: `Đã ẩn (${list.counts.hidden})` },
  ]

  return (
    <>
      <StatGrid>
        <StatCard label="Tổng số đánh giá" value={list.counts.all.toLocaleString("vi-VN")} unit="đánh giá" chip="Tất cả" chipTone="info" />
        <StatCard label="Đang hiển thị" value={list.counts.visible.toLocaleString("vi-VN")} unit="đánh giá" chip="Khách thấy" chipTone="success" />
        <StatCard label="Đã ẩn" value={list.counts.hidden.toLocaleString("vi-VN")} unit="đánh giá" chip="Chỉ Admin thấy" chipTone={list.counts.hidden > 0 ? "warning" : "success"} />
      </StatGrid>

      <ListSection title="Danh Sách Đánh Giá">
        <ListToolbar placeholder="Tìm theo sản phẩm, khách hàng, nội dung..." filters={filters} filterParam="status" />
        <ListCard>
          <ReviewTable items={list.items} />
          <AdminPagination page={list.page} pageSize={list.pageSize} total={list.total} noun="đánh giá" basePath="/admin/reviews" searchParams={sp} />
        </ListCard>
      </ListSection>
    </>
  )
}
