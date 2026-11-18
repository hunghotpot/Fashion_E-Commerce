"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

/*
 * Ảnh kèm một đánh giá: hàng ảnh thu nhỏ, bấm một ảnh để xem lớn trong hộp thoại (Esc hoặc nút đóng để thoát).
 * Mỗi ảnh thu nhỏ là một nút có nhãn đọc được ("Xem ảnh 2 trên 3"); ảnh có alt mô tả để trình đọc màn hình biết đó là ảnh của khách.
 */
export function ReviewImages({ urls, author }: { urls: string[]; author: string }) {
  const [open, setOpen] = useState<number | null>(null)
  if (urls.length === 0) return null
  const current = open === null ? null : urls[open]

  return (
    <>
      <ul className="flex flex-wrap gap-2 pt-1" aria-label={`Ảnh của ${author}`}>
        {urls.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Xem ảnh ${i + 1} trên ${urls.length}`}
              className="block size-16 overflow-hidden bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring pointer-coarse:size-20"
            >
              {/* Ảnh do khách tải lên đã được nén ở trình duyệt: không đi qua tối ưu ảnh của Next. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Ảnh ${i + 1} do ${author} gửi`} width={96} height={96} loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={current !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="gap-3 p-4 sm:max-w-3xl sm:p-6">
          <DialogTitle className="sr-only">{`Ảnh đánh giá của ${author}`}</DialogTitle>
          <DialogDescription className="sr-only">{`Ảnh ${(open ?? 0) + 1} trên ${urls.length}`}</DialogDescription>
          {current && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt={`Ảnh ${(open ?? 0) + 1} do ${author} gửi`} className="mx-auto max-h-[75dvh] w-auto max-w-full object-contain" />
          )}
          {urls.length > 1 && open !== null && (
            <div className="flex items-center justify-center gap-3 text-label">
              <button type="button" disabled={open === 0} onClick={() => setOpen(open - 1)} className="min-h-11 px-4 font-semibold hover:underline disabled:opacity-40">
                Ảnh trước
              </button>
              <span className="tabular-nums text-muted-foreground">
                {open + 1}/{urls.length}
              </span>
              <button
                type="button"
                disabled={open === urls.length - 1}
                onClick={() => setOpen(open + 1)}
                className="min-h-11 px-4 font-semibold hover:underline disabled:opacity-40"
              >
                Ảnh sau
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
