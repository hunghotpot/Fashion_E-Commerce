import Link from "next/link"
import { AdminEmpty, AdminTable, AdminTr } from "@/components/admin/list/admin-table"
import { ReviewActions } from "@/components/admin/reviews/review-actions"
import { StatusPill } from "@/components/admin/status-pill"
import { UserAvatar } from "@/components/account/user-avatar"
import { StarRating } from "@/components/review/star-rating"
import { formatDateTime } from "@/lib/format"
import type { AdminReviewItem } from "@/server/services/admin-review.service"

const COLUMNS = [
  { label: "Khách hàng" },
  { label: "Sản phẩm" },
  { label: "Đánh giá" },
  { label: "Ngày gửi" },
  { label: "Trạng thái" },
  { label: "Thao tác", className: "text-right" },
]

export function ReviewTable({ items }: { items: AdminReviewItem[] }) {
  if (items.length === 0) {
    return <AdminEmpty title="Không tìm thấy đánh giá nào." hint="Thử đổi từ khóa hoặc bộ lọc." />
  }
  return (
    <AdminTable columns={COLUMNS} minWidth={900} caption="Danh sách đánh giá sản phẩm">
      {items.map((r) => {
        const hidden = r.status === "HIDDEN"
        return (
          <AdminTr key={r.id}>
            <td>
              <div className="flex items-center gap-3">
                <UserAvatar name={r.user.name} avatar={r.user.avatar} className="size-10" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.user.email}</p>
                </div>
              </div>
            </td>
            <td className="max-w-48">
              <Link href={`/products/${r.product.slug}#danh-gia`} target="_blank" rel="noopener" className="line-clamp-2 rounded font-semibold hover:underline">
                {r.product.name}
                <span className="sr-only"> (mở trong tab mới)</span>
              </Link>
            </td>
            <td className="max-w-80">
              <StarRating value={r.rating} />
              {r.content ? (
                <p className="mt-1 line-clamp-3 text-label [overflow-wrap:anywhere] whitespace-pre-line">{r.content}</p>
              ) : (
                <p className="mt-1 text-label text-muted-foreground">Không có nhận xét</p>
              )}
              {r.images.length > 0 && (
                <ul className="mt-2 flex gap-1.5" aria-label={`${r.images.length} ảnh kèm theo`}>
                  {r.images.map((url, i) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noopener" className="block size-10 overflow-hidden bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring pointer-coarse:size-11">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Ảnh ${i + 1} của đánh giá (mở ảnh lớn trong tab mới)`} width={44} height={44} loading="lazy" className="size-full object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </td>
            <td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
            <td>
              <StatusPill tone={hidden ? "danger" : "success"} title={hidden && r.hiddenReason ? `Lý do: ${r.hiddenReason}` : undefined}>
                {hidden ? "Đã ẩn" : "Đang hiện"}
              </StatusPill>
              {hidden && r.hiddenReason && <p className="mt-1 max-w-40 truncate text-xs text-muted-foreground">{r.hiddenReason}</p>}
            </td>
            <td>
              <div className="flex items-center justify-end">
                <ReviewActions reviewId={r.id} hidden={hidden} author={r.user.name} />
              </div>
            </td>
          </AdminTr>
        )
      })}
    </AdminTable>
  )
}
