"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ProductImageData } from "@/types/catalog"

// Màn lớn: lưới ảnh kiểu tạp chí. Màn nhỏ: ảnh lớn + mũi tên + hàng thumbnail (viền ink khi đang chọn).
// Bấm ảnh để xem toàn màn hình; trong hộp xem có mũi tên, phím ← →, bộ đếm và thumbnail để chuyển ảnh. Không phóng to khi rê chuột.
// Cha dùng `key` (màu đang chọn) để reset về ảnh đầu khi bộ ảnh đổi.
export function ProductGallery({ images, name }: { images: ProductImageData[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [open, setOpen] = useState(false)

  if (images.length === 0) {
    return (
      <div className="grid aspect-[744/520] place-items-center rounded-3xl bg-secondary text-sm text-subtle-foreground">
        [Hình ảnh sản phẩm]
      </div>
    )
  }

  const current = images[index]
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length)

  return (
    <div>
      {/* Máy tính: ảnh xếp lưới kiểu tạp chí (ảnh đầu rộng hai cột), bấm để xem toàn màn hình. */}
      <ul className="hidden grid-cols-2 gap-3 lg:grid" aria-label="Ảnh sản phẩm">
        {images.slice(0, 8).map((img, i) => (
          <li key={img.url} className={i === 0 ? "col-span-2" : undefined}>
            <button
              type="button"
              onClick={() => {
                setIndex(i)
                setOpen(true)
              }}
              aria-label={`Phóng to ảnh ${i + 1}`}
              className={cn(
                "relative block w-full cursor-zoom-in overflow-hidden bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                i === 0 ? "aspect-[4/4.6]" : "aspect-4/5"
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || name}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 34vw, 100vw"
                className="object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-4 lg:hidden">
      <div className="relative aspect-[744/520] overflow-hidden rounded-3xl bg-secondary">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Phóng to ảnh"
          className="absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Image
            src={current.url}
            alt={current.alt || name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </button>
        {images.length > 1 && (
          <>
            {index > 0 && (
              <ArrowButton label="Ảnh trước" side="left" onClick={() => go(-1)}>
                <ChevronLeftIcon />
              </ArrowButton>
            )}
            <ArrowButton label="Ảnh sau" side="right" onClick={() => go(1)}>
              <ChevronRightIcon />
            </ArrowButton>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-3" aria-label="Ảnh sản phẩm">
          {images.slice(0, 8).map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-[140/108] w-full overflow-hidden rounded-2xl border-2 bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                  i === index ? "border-ink" : "border-border opacity-80 hover:opacity-100"
                )}
              >
                <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[95vh] sm:max-w-3xl"
          onKeyDown={(e) => {
            if (images.length < 2) return
            if (e.key === "ArrowLeft") go(-1)
            else if (e.key === "ArrowRight") go(1)
          }}
        >
          <DialogHeader>
            <DialogTitle className="line-clamp-1">{name}</DialogTitle>
            <DialogDescription aria-live="polite">
              Ảnh {index + 1} / {images.length}
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[55vh] max-h-[40rem] w-full shrink-0 overflow-hidden bg-secondary">
            <Image src={current.url} alt={current.alt || name} fill sizes="(min-width: 768px) 48rem, 100vw" className="object-contain" />
            {images.length > 1 && (
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
          {images.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto" aria-label="Chọn ảnh">
              {images.slice(0, 8).map((img, i) => (
                <li key={img.url} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Xem ảnh ${i + 1}`}
                    aria-current={i === index}
                    className={cn(
                      "relative block size-16 overflow-hidden border-2 bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                      i === index ? "border-ink" : "border-border opacity-80 hover:opacity-100"
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
        "absolute inset-y-0 my-auto grid size-11 place-items-center rounded-full bg-card/90 text-foreground ring-1 ring-border-strong transition-colors outline-none hover:bg-ink hover:text-white focus-visible:ring-3 focus-visible:ring-ring/60 [&_svg]:size-5",
        side === "left" ? "left-3 md:left-5" : "right-3 md:right-5"
      )}
    >
      {children}
    </button>
  )
}
