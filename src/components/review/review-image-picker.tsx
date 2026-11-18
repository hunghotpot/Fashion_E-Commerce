"use client"

import { useRef, useState } from "react"
import { ImagePlusIcon, XIcon } from "lucide-react"
import { compressImage } from "@/components/review/compress-image"
import { cn } from "@/lib/cn"
import { REVIEW_MAX_IMAGES } from "@/lib/review"

// Khớp REVIEW_IMAGE_MAX_BYTES ở server (src/server/uploads.ts); server vẫn kiểm lại.
const MAX_UPLOAD_BYTES = 600 * 1024
const ACCEPT = "image/jpeg,image/png,image/webp"

/*
 * Chọn ảnh kèm đánh giá: bấm hoặc kéo thả (nhiều ảnh cùng lúc được), tối đa REVIEW_MAX_IMAGES.
 * Mỗi ảnh được thu nhỏ/nén ở trình duyệt rồi tải lên NGAY; `value` là danh sách URL đã tải lên (chưa gắn vào đánh giá, form gửi đi sau).
 * Trong lúc đang tải thì khoá nút xoá và báo `onBusyChange(true)` để form không cho gửi khi ảnh chưa xong.
 */
export function ReviewImagePicker({
  value,
  onChange,
  onBusyChange,
  disabled = false,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  onBusyChange: (busy: boolean) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const full = value.length >= REVIEW_MAX_IMAGES

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"))
    if (files.length === 0) return setError("Chỉ nhận ảnh JPG, PNG hoặc WebP")
    const room = REVIEW_MAX_IMAGES - value.length
    if (room <= 0) return setError(`Tối đa ${REVIEW_MAX_IMAGES} ảnh`)

    setError(files.length > room ? `Chỉ thêm được ${room} ảnh nữa (tối đa ${REVIEW_MAX_IMAGES})` : null)
    setBusy(true)
    onBusyChange(true)
    let next = [...value]
    try {
      for (const file of files.slice(0, room)) {
        try {
          const blob = await compressImage(file, MAX_UPLOAD_BYTES)
          const form = new FormData()
          form.append("file", blob, "review.webp")
          const res = await fetch("/api/account/reviews/images", { method: "POST", body: form })
          const body = (await res.json().catch(() => ({}))) as { url?: string; message?: string }
          if (!res.ok || !body.url) {
            setError(body.message ?? "Không tải được ảnh, vui lòng thử lại")
            continue
          }
          next = [...next, body.url]
          onChange(next)
        } catch (e) {
          setError(
            e instanceof Error && e.message === "too-big"
              ? "Ảnh quá nặng, hãy chọn ảnh khác"
              : "Không đọc được ảnh này, hãy thử ảnh JPG, PNG hoặc WebP khác"
          )
        }
      }
    } finally {
      setBusy(false)
      onBusyChange(false)
      if (inputRef.current) inputRef.current.value = "" // cho phép chọn lại đúng file vừa chọn
    }
  }

  const inactive = disabled || busy

  return (
    <div className="space-y-2">
      <p id="review-images-label" className="text-label font-semibold">
        Ảnh kèm theo <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
      </p>

      <div
        role="group"
        aria-labelledby="review-images-label"
        onDragOver={(e) => {
          if (inactive || full) return
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!inactive && !full) void addFiles(e.dataTransfer.files)
        }}
        className={cn("flex flex-wrap gap-2 p-1 transition-colors", dragging && "bg-brand-soft outline-2 -outline-offset-2 outline-brand outline-dashed")}
      >
        {value.map((url, i) => (
          <div key={url} className="relative size-20 bg-secondary sm:size-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Ảnh ${i + 1} bạn đã chọn`} width={96} height={96} className="size-full object-cover" />
            <button
              type="button"
              disabled={inactive}
              aria-label={`Xoá ảnh ${i + 1}`}
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute top-1 right-1 grid size-7 place-items-center bg-ink/85 text-white outline-none hover:bg-ink focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50 pointer-coarse:size-11"
            >
              <XIcon aria-hidden className="size-4" />
            </button>
          </div>
        ))}

        {!full && (
          <button
            type="button"
            disabled={inactive}
            onClick={() => inputRef.current?.click()}
            className="grid size-20 place-items-center gap-1 border border-dashed border-subtle-foreground bg-card px-1 text-center text-xs font-semibold text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:size-24"
          >
            <span className="grid justify-items-center gap-1">
              <ImagePlusIcon aria-hidden className="size-5" />
              {busy ? "Đang tải..." : "Thêm ảnh"}
            </span>
          </button>
        )}

        <input ref={inputRef} type="file" accept={ACCEPT} multiple tabIndex={-1} className="sr-only" onChange={(e) => e.target.files && void addFiles(e.target.files)} />
      </div>

      <p className="text-xs text-muted-foreground">
        {value.length}/{REVIEW_MAX_IMAGES} ảnh · JPG, PNG hoặc WebP, bấm hoặc kéo thả vào đây. Ảnh được thu nhỏ tự động.
      </p>
      {error && (
        <p role="alert" className="text-label font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
