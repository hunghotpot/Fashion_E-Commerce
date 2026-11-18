import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { UserAvatar } from "@/components/account/user-avatar"
import { ReviewForm } from "@/components/review/review-form"
import { ReviewImages } from "@/components/review/review-images"
import { StarRating } from "@/components/review/star-rating"
import { SectionHeading } from "@/components/product/product-sections"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"
import { formatRating, type ReviewSummary } from "@/lib/review"
import { getMyReviewState, listProductReviews } from "@/server/services/review.service"

const STARS_DESC = [5, 4, 3, 2, 1] as const

/*
 * Khối đánh giá ở trang chi tiết sản phẩm (server component). Phân trang bằng liên kết thật ?rpage=N#danh-gia (crawl được, mở tab mới được).
 * Bên phải/dưới phần tóm tắt là một trong ba trạng thái cho khách: chưa đăng nhập, chưa nhận hàng, hoặc form viết/sửa.
 */
export async function ProductReviews({
  productId,
  slug,
  summary,
  userId,
  page,
}: {
  productId: string
  slug: string
  summary: ReviewSummary
  userId: string | null
  page: number
}) {
  const [list, mine] = await Promise.all([
    listProductReviews({ productId, page }),
    userId ? getMyReviewState(userId, productId) : Promise.resolve(null),
  ])
  const base = `/products/${slug}`
  const href = (p: number) => `${base}${p > 1 ? `?rpage=${p}` : ""}#danh-gia`

  return (
    <section id="danh-gia" aria-labelledby="reviews-heading" className="scroll-mt-24 space-y-8 border-t border-border pt-8">
      <SectionHeading id="reviews-heading" title="Đánh giá từ khách hàng" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
        <div className="space-y-6">
          <Summary summary={summary} />
          {!userId ? (
            <Notice>
              <Link href={`/login?next=${encodeURIComponent(`${base}#danh-gia`)}`} className="font-semibold underline underline-offset-4 hover:text-primary">
                Đăng nhập
              </Link>{" "}
              để viết đánh giá cho sản phẩm bạn đã mua.
            </Notice>
          ) : !mine?.canReview ? (
            <Notice>Bạn có thể đánh giá sản phẩm này sau khi đã nhận hàng.</Notice>
          ) : (
            <ReviewForm productId={productId} existing={mine.review} />
          )}
        </div>

        <div className="space-y-6">
          {list.items.length === 0 ? (
            <div className="border border-dashed border-border-strong px-6 py-10 text-center">
              <p className="font-semibold">Chưa có đánh giá nào</p>
              <p className="mt-1 text-label text-muted-foreground">Đánh giá của khách đã nhận hàng sẽ hiện ở đây.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {list.items.map((r) => (
                <li key={r.id} className="flex gap-4 py-5">
                  <UserAvatar name={r.authorName} avatar={r.avatar} className="size-10" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-semibold">{r.authorName}</p>
                      <StarRating value={r.rating} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={r.createdAt.toISOString()}>{formatDate(r.createdAt)}</time>
                      {r.edited && " · Đã chỉnh sửa"}
                    </p>
                    {r.content && <p className="text-label leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">{r.content}</p>}
                    <ReviewImages urls={r.images} author={r.authorName} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {list.totalPages > 1 && (
            <nav aria-label="Phân trang đánh giá" className="flex items-center justify-center gap-1.5">
              {list.page > 1 && <PageLink href={href(list.page - 1)} label="Trang trước" icon={<ChevronLeftIcon className="size-4" />} />}
              {Array.from({ length: list.totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={href(p)}
                  scroll={false}
                  aria-current={p === list.page ? "page" : undefined}
                  className={cn("grid size-10 pointer-coarse:size-11 place-items-center text-sm font-semibold", p === list.page ? "bg-ink text-white" : "hover:bg-secondary")}
                >
                  {p}
                </Link>
              ))}
              {list.page < list.totalPages && <PageLink href={href(list.page + 1)} label="Trang sau" icon={<ChevronRightIcon className="size-4" />} />}
            </nav>
          )}
        </div>
      </div>
    </section>
  )
}

function PageLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} aria-label={label} className="grid size-10 pointer-coarse:size-11 place-items-center hover:bg-secondary">
      {icon}
    </Link>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="border border-border bg-secondary px-4 py-3 text-label">{children}</p>
}

/** Sao trung bình lớn và phân bố theo mức sao. Mỗi dòng có số đếm bằng chữ nên không chỉ dựa vào độ dài thanh. */
function Summary({ summary }: { summary: ReviewSummary }) {
  if (summary.count === 0) return null
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <p className="text-5xl leading-none font-semibold tabular-nums">{formatRating(summary.average)}</p>
        <div className="space-y-1">
          <StarRating value={summary.average} iconClassName="size-5" />
          <p className="text-label text-muted-foreground">{summary.count} đánh giá</p>
        </div>
      </div>
      <ul className="space-y-1.5" aria-label="Phân bố số sao">
        {STARS_DESC.map((n) => {
          const count = summary.distribution[n]
          return (
            <li key={n} className="flex items-center gap-3 text-label">
              <span className="w-12 shrink-0 tabular-nums">{n} sao</span>
              <span aria-hidden className="h-2 flex-1 bg-secondary">
                <span className="block h-full bg-brand" style={{ width: `${(count / summary.count) * 100}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right text-muted-foreground tabular-nums">{count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
