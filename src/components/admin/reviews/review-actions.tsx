"use client"

import { useState } from "react"
import { hideReviewAction, showReviewAction } from "@/app/actions/admin-reviews"
import { useAdminAction } from "@/components/admin/use-admin-action"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { MAX_HIDDEN_REASON } from "@/lib/validators/admin-review"

/**
 * Ẩn/Hiện một đánh giá. Ẩn mở hộp thoại để ghi lý do (không bắt buộc, chỉ Admin thấy); hiện lại thì làm ngay.
 * Server vẫn là chốt kiểm quyền.
 */
export function ReviewActions({ reviewId, hidden, author }: { reviewId: string; hidden: boolean; author: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { pending, run } = useAdminAction()

  const link = "rounded text-label font-semibold outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring pointer-coarse:min-h-11"

  if (hidden) {
    return (
      <button type="button" disabled={pending} aria-label={`Hiện lại đánh giá của ${author}`} onClick={() => run(() => showReviewAction(reviewId))} className={`${link} text-success`}>
        {pending ? "Đang xử lý..." : "Hiện lại"}
      </button>
    )
  }

  return (
    <>
      <button type="button" aria-label={`Ẩn đánh giá của ${author}`} onClick={() => setOpen(true)} className={`${link} text-destructive`}>
        Ẩn
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setReason("")
        }}
      >
        <DialogContent className="sm:max-w-md sm:p-8" showCloseButton={false}>
          <DialogHeader className="pr-0">
            <DialogTitle>Ẩn đánh giá này?</DialogTitle>
            <DialogDescription className="text-label">
              Đánh giá của {author} sẽ không còn hiện cho khách khác và không tính vào sao trung bình. Bạn có thể hiện lại bất cứ lúc nào.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor={`hide-reason-${reviewId}`} className="text-label font-semibold">
              Lý do <span className="font-normal text-muted-foreground">(không bắt buộc, chỉ Admin thấy)</span>
            </label>
            <Textarea
              id={`hide-reason-${reviewId}`}
              value={reason}
              maxLength={MAX_HIDDEN_REASON}
              onChange={(e) => setReason(e.target.value)}
              disabled={pending}
              placeholder="Ví dụ: ngôn từ không phù hợp, quảng cáo..."
            />
          </div>
          <DialogFooter className="border-t-0 pt-0">
            <Button type="button" variant="secondary" size="md" className="px-8" disabled={pending} onClick={() => setOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              type="button"
              size="md"
              className="px-8"
              disabled={pending}
              onClick={() => run(() => hideReviewAction({ reviewId, reason }), { onSuccess: () => setOpen(false) })}
            >
              {pending ? "Đang xử lý..." : "Ẩn đánh giá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
