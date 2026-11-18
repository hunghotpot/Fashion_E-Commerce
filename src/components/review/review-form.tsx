"use client"

import { useId, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteReviewAction, saveReviewAction } from "@/app/actions/review"
import { RatingInput } from "@/components/review/rating-input"
import { ReviewImagePicker } from "@/components/review/review-image-picker"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { REVIEW_MAX_CONTENT } from "@/lib/validators/review"

export interface MyReview {
  rating: number
  content: string | null
  images: string[]
  /** Admin đã ẩn: chỉ mình khách còn thấy. */
  hidden: boolean
}

/*
 * Form viết/sửa đánh giá của CHÍNH khách (chỉ hiện khi đã nhận hàng; server vẫn kiểm lại). Chưa chọn sao thì báo lỗi ngay dưới ô sao.
 * Xoá cần xác nhận hai bước ngay tại chỗ. Gửi xong thì làm mới trang để danh sách và sao trung bình cập nhật.
 */
export function ReviewForm({ productId, existing }: { productId: string; existing: MyReview | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [content, setContent] = useState(existing?.content ?? "")
  const [images, setImages] = useState<string[]>(existing?.images ?? [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const errorId = useId()
  const counterId = useId()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError("Vui lòng chọn số sao")
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await saveReviewAction({ productId, rating, content, images })
      if (res.ok) {
        toast.success(existing ? "Đã cập nhật đánh giá" : "Cảm ơn bạn đã đánh giá")
        router.refresh()
      } else {
        setError(res.message)
      }
    })
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteReviewAction(productId)
      if (res.ok) {
        toast.success(res.message)
        setRating(0)
        setContent("")
        setImages([])
        setConfirmingDelete(false)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 border border-border bg-card p-4 sm:p-6">
      <h3 className="text-lg font-semibold">{existing ? "Đánh giá của bạn" : "Viết đánh giá"}</h3>

      {existing?.hidden && (
        <p role="status" className="bg-warning-soft px-3 py-2 text-label text-warning">
          Đánh giá của bạn đang bị ẩn nên người khác chưa thấy. Sửa nội dung không làm nó hiện lại; cửa hàng sẽ xem xét.
        </p>
      )}

      <RatingInput
        value={rating}
        onChange={(n) => {
          setRating(n)
          setError(null)
        }}
        invalid={!!error && rating < 1}
        describedBy={error ? errorId : undefined}
        disabled={pending}
      />

      <div className="space-y-2">
        <label htmlFor="review-content" className="text-label font-semibold">
          Nhận xét <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
        </label>
        <Textarea
          id="review-content"
          value={content}
          maxLength={REVIEW_MAX_CONTENT}
          onChange={(e) => setContent(e.target.value)}
          disabled={pending}
          placeholder="Chất vải, độ vừa vặn, màu sắc so với ảnh..."
          aria-describedby={counterId}
          className="min-h-28"
        />
        <p id={counterId} className="text-right text-xs text-muted-foreground tabular-nums">
          {content.length}/{REVIEW_MAX_CONTENT}
        </p>
      </div>

      <ReviewImagePicker value={images} onChange={setImages} onBusyChange={setUploading} disabled={pending} />

      {error && (
        <p id={errorId} role="alert" className="text-label font-semibold text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" variant="dark" disabled={pending || uploading}>
          {pending ? "Đang lưu..." : uploading ? "Đang tải ảnh..." : existing ? "Lưu thay đổi" : "Gửi đánh giá"}
        </Button>
        {existing &&
          (confirmingDelete ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-label">Xoá hẳn đánh giá này?</span>
              <Button type="button" size="md" variant="secondary" disabled={pending} onClick={() => setConfirmingDelete(false)}>
                Giữ lại
              </Button>
              <Button type="button" size="md" disabled={pending} onClick={remove}>
                Xoá đánh giá
              </Button>
            </span>
          ) : (
            <Button type="button" size="md" variant="ghost" disabled={pending} onClick={() => setConfirmingDelete(true)}>
              Xoá đánh giá
            </Button>
          ))}
      </div>
    </form>
  )
}
