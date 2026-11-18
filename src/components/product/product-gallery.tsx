"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ProductImageData } from "@/types/catalog"

const MAX_IMAGES = 8

/*
 * Máy tính: dải ảnh nhỏ dọc bên trái + MỘT ảnh chính tỷ lệ 4:5, cao tối đa 78% khung nhìn để cụm chọn và nút mua nằm cùng màn hình đầu tiên.
 * Điện thoại: ảnh 4:5 vuốt ngang (scroll-snap, vuốt bằng ngón tay hoặc phím mũi tên khi đang focus) kèm bộ đếm "1/5", không mũi tên, không thumbnail.
 * Bấm ảnh để xem lớn; hộp xem có mũi tên, phím ← →, bộ đếm và thumbnail. Không phóng to khi rê chuột.
 * Cha dùng `key` (màu đang chọn) để reset về ảnh đầu khi bộ ảnh đổi.
 */
export function ProductGallery({ images, name }: { images: ProductImageData[]; name: string }) {
  const shown = images.slice(0, MAX_IMAGES)
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const swipeRef = useRef<HTMLUListElement>(null)
  const frame = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  if (shown.length === 0) {
    return (
      <div className="grid aspect-[4/5] place-items-center rounded-3xl bg-secondary text-sm text-subtle-foreground">
        [Hình ảnh sản phẩm]
      </div>
    )
  }

  const current = shown[index]
  const go = (delta: number) => setIndex((i) => (i + delta + shown.length) % shown.length)

  // Điện thoại: chỉ số ảnh theo vị trí cuộn (gộp theo khung hình, không cập nhật liên tục khi đang vuốt).
  function onSwipe() {
    const el = swipeRef.current
    if (!el || el.clientWidth === 0) return
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      setIndex(Math.min(Math.max(Math.round(el.scrollLeft / el.clientWidth), 0), shown.length - 1))
    })
  }

  // Đóng hộp xem lớn: đưa dải vuốt về đúng ảnh vừa xem.
  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) return
    requestAnimationFrame(() => {
      const el = swipeRef.current
      if (el && el.clientWidth > 0) el.scrollTo({ left: index * el.clientWidth, behavior: "instant" })
    })
  }

  return (
    <div>
      {/* Máy tính */}
      <div className="hidden grid-cols-[64px_minmax(0,1fr)] gap-3 lg:grid">
        <ul className="flex max-h-[78dvh] flex-col gap-2 overflow-y-auto" aria-label="Ảnh sản phẩm">
          {shown.map((img, i) => (
            <li key={`${img.url}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-4/5 w-16 overflow-hidden border-2 bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring",
                  i === index ? "border-ink" : "border-border opacity-85 hover:opacity-100"
                )}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
        <div className="relative mx-auto w-full max-w-[calc(78dvh*0.8)]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Phóng to ảnh ${index + 1}`}
            className="relative block aspect-4/5 w-full cursor-zoom-in overflow-hidden bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <Image src={current.url} alt={current.alt || name} fill priority sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </button>
          {shown.length > 1 && (
            <>
              <ArrowButton label="Ảnh trước" side="left" onClick={() => go(-1)}>
                <ChevronLeftIcon />
              </ArrowButton>
              <ArrowButton label="Ảnh sau" side="right" onClick={() => go(1)}>
                <ChevronRightIcon />
              </ArrowButton>
            </>
          )}
        </div>
      </div>

      {/* Điện thoại */}
      <div className="relative lg:hidden">
        <ul
          ref={swipeRef}
          onScroll={onSwipe}
          tabIndex={0}
          aria-label="Ảnh sản phẩm, vuốt ngang để xem thêm"
          className="flex snap-x snap-mandatory overflow-x-auto bg-secondary outline-none [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((img, i) => (
            <li key={`${img.url}-${i}`} className="relative aspect-4/5 w-full shrink-0 snap-center">
              <button
                type="button"
                onClick={() => {
                  setIndex(i)
                  setOpen(true)
                }}
                aria-label={`Phóng to ảnh ${i + 1}`}
                className="absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Image src={img.url} alt={img.alt || name} fill priority={i === 0} sizes="100vw" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
        {shown.length > 1 && (
          <>
            <span aria-hidden className="pointer-events-none absolute right-3 bottom-3 border border-border bg-card/90 px-2.5 py-0.5 text-xs font-semibold tabular-nums">
              {index + 1}/{shown.length}
            </span>
            <p className="sr-only" aria-live="polite">
              Ảnh {index + 1} trên {shown.length}
            </p>
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[95vh] sm:max-w-3xl"
          onKeyDown={(e) => {
            if (shown.length < 2) return
            if (e.key === "ArrowLeft") go(-1)
            else if (e.key === "ArrowRight") go(1)
          }}
        >
          <DialogHeader>
            <DialogTitle className="line-clamp-1">{name}</DialogTitle>
            <DialogDescription aria-live="polite">
              Ảnh {index + 1} / {shown.length}
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[55vh] max-h-[40rem] w-full shrink-0 overflow-hidden bg-secondary">
            <Image src={current.url} alt={current.alt || name} fill sizes="(min-width: 768px) 48rem, 100vw" className="object-contain" />
            {shown.length > 1 && (
              <>
                <ArrowButton label="Ảnh trước" side="left" onClick={() => go(-1)}>
                  <ChevronLeftIcon />
                </ArrowButton>
                <ArrowButton label="Ảnh sau" side="right" onClick={() => go(1)}>
                  <ChevronRightIcon />
                </ArrowButton>
              </>
            )}
          </div>
          {shown.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto" aria-label="Chọn ảnh">
              {shown.map((img, i) => (
                <li key={`${img.url}-${i}`} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Xem ảnh ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      "relative block size-16 overflow-hidden border-2 bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring",
                      i === index ? "border-ink" : "border-border opacity-85 hover:opacity-100"
                    )}
                  >
                    <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Nút mũi tên đè lên ảnh. Căn giữa dọc bằng inset + margin auto (KHÔNG dùng -translate-y-1/2: nút dùng chung có
// active:translate-y-px nên ghi đè transform và làm nút nhảy khi bấm). Chỉ đổi màu khi rê chuột, không chuyển động.
function ArrowButton({
  label,
  side,
  onClick,
  children,
}: {
  label: string
  side: "left" | "right"
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute inset-y-0 my-auto grid size-11 place-items-center rounded-full bg-card/90 text-foreground ring-1 ring-border-strong transition-colors outline-none hover:bg-ink hover:text-white focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:size-5",
        side === "left" ? "left-3 md:left-5" : "right-3 md:right-5"
      )}
    >
      {children}
    </button>
  )
}
