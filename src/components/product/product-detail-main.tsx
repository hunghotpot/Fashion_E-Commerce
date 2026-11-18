"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/cn"
import { ProductGallery } from "@/components/product/product-gallery"
import { AskSizeButton } from "@/components/assistant/ask-size-button"
import { SizeGuideDialog } from "@/components/product/size-guide-dialog"
import { RatingLine } from "@/components/review/star-rating"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatVnd, GENDER_LABEL, STYLE_LABEL } from "@/lib/format"
import {
  findVariant,
  imagesForColor,
  initialSelection,
  listColors,
  listSizes,
  missingAxes,
  optionState,
  priceRange,
  select,
  type Axis,
  type OptionState,
  type Selection,
} from "@/lib/product-variants"
import { useAssistantUi } from "@/stores/assistant-ui"
import type { ProductDetail } from "@/types/catalog"

export interface CartItemInput {
  variantId: string
  quantity: number
}

const LOW_STOCK = 5

/*
 * Phần tương tác của trang chi tiết: ảnh | tên, giá, màu, size, nút mua, mô tả, tags. KHÔNG có ô số lượng: thêm giỏ và mua ngay luôn là 1 sản phẩm
 * (khách chỉnh số lượng trong giỏ hàng). Mục tiêu là màn hình đầu tiên có đủ ảnh, giá, màu, size và nút mua.
 * Thuần giao diện: giỏ hàng được nối ở ProductDetailConnected qua onAddToCart / onBuyNow.
 * Hai nút mua luôn bấm được (trừ khi hết hàng); bấm khi chưa chọn đủ thì nhắc ngay dưới phần còn thiếu và đưa focus tới đó.
 */
export function ProductDetailMain({
  product,
  careTips,
  rating,
  wishlistSlot,
  wishlistInline,
  onAddToCart,
  onBuyNow,
}: {
  product: ProductDetail
  careTips: string[]
  /** Nút yêu thích đặt cạnh hai nút mua (máy tính; do ProductDetailConnected nối với server). */
  wishlistSlot?: React.ReactNode
  /** Nút yêu thích đặt cạnh giá (điện thoại, vì hàng nút mua dính đáy không đủ chỗ). */
  wishlistInline?: React.ReactNode
  /** Sao trung bình, hiện dưới tên và dẫn xuống khối đánh giá; vắng khi chưa có đánh giá. */
  rating?: { average: number; count: number }
  onAddToCart?: (item: CartItemInput) => void
  onBuyNow?: (item: CartItemInput) => void
}) {
  const { variants } = product
  const [sel, setSel] = useState<Selection>(() => initialSelection(variants))
  // Đã bấm mua khi chưa chọn đủ: lúc đó mới hiện nhắc (không hiện sẵn khi vừa vào trang).
  const [attempted, setAttempted] = useState(false)
  const colorGroup = useRef<HTMLFieldSetElement>(null)
  const sizeGroup = useRef<HTMLFieldSetElement>(null)

  const colors = useMemo(() => listColors(variants), [variants])
  const sizes = useMemo(() => listSizes(variants), [variants])
  const variant = findVariant(variants, sel)
  const range = priceRange(variants, sel)
  const images = imagesForColor(product.images, sel.color)
  const missing = missingAxes(variants, sel)

  const soldOutAll = variants.every((v) => v.stock <= 0)
  const buyDisabled = soldOutAll || (!!variant && variant.stock <= 0)
  // Nhắc dưới nhóm thiếu đầu tiên (màu rồi size), nêu rõ cả hai khi thiếu cả hai.
  const hintText = missing.length === 2 ? "Chọn màu và size để tiếp tục" : missing[0] === "color" ? "Chọn màu để tiếp tục" : "Chọn size để tiếp tục"
  const hintUnder: Axis | null = attempted && missing.length > 0 ? missing[0] : null

  // Bấm lại giá trị đang chọn = bỏ chọn (để đổi sang màu/size không có tổ hợp với lựa chọn kia).
  function pick(axis: Axis, value: string) {
    setAttempted(false)
    setSel((cur) => {
      if (cur[axis] === value) {
        const rest = { ...cur }
        delete rest[axis]
        return rest
      }
      return select(variants, cur, axis, value)
    })
  }

  function submit(action?: (item: CartItemInput) => void) {
    if (missing.length > 0) {
      setAttempted(true)
      const group = missing[0] === "color" ? colorGroup.current : sizeGroup.current
      group?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()
      return
    }
    if (!variant || variant.stock <= 0) return
    action?.({ variantId: variant.id, quantity: 1 })
  }

  // Trợ lý gợi ý size và khách bấm "Chọn size": chọn đúng size đó nếu còn bán (bỏ qua nếu đã chọn rồi).
  const sizeRequest = useAssistantUi((s) => s.sizeRequest)
  useEffect(() => {
    if (!sizeRequest || !sizes.includes(sizeRequest.size)) return
    setSel((cur) => (cur.size === sizeRequest.size ? cur : select(variants, cur, "size", sizeRequest.size)))
  }, [sizeRequest, sizes, variants])

  const subtitle = [product.category.name, GENDER_LABEL[product.gender], STYLE_LABEL[product.style] ?? product.style]

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
      {/* Máy tính: ảnh dính khi cuộn (cột thông tin dài hơn ảnh) để vẫn thấy ảnh khi đọc mô tả, chất liệu, chăm sóc. */}
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <ProductGallery key={sel.color ?? "all"} images={images} name={product.name} />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="space-y-2">
          <h1 className="text-3xl leading-tight font-semibold text-balance lg:text-4xl">{product.name}</h1>
          <p className="text-label text-muted-foreground">{subtitle.join(" • ")}</p>
          {rating && (
            <a href="#danh-gia" className="inline-flex min-h-6 items-center rounded outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring pointer-coarse:min-h-11">
              <RatingLine average={rating.average} count={rating.count} />
              <span className="sr-only">Xem đánh giá</span>
            </a>
          )}
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-2xl font-semibold text-primary" aria-live="polite">
              {range.min === range.max ? formatVnd(range.min) : `${formatVnd(range.min)} – ${formatVnd(range.max)}`}
            </p>
            {wishlistInline}
          </div>
        </div>

        <fieldset ref={colorGroup} className="space-y-3">
          <legend className="text-label font-semibold">
            Màu
            {sel.color && (
              <>
                : <span className="font-normal text-muted-foreground">{sel.color}</span>
              </>
            )}
          </legend>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => {
              const state = optionState(variants, sel, "color", c.name)
              const active = sel.color === c.name
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${c.name}${stateLabel(state)}`}
                  disabled={state !== "available" && !active}
                  title={`${c.name}${stateLabel(state)}`}
                  onClick={() => pick("color", c.name)}
                  className={cn(
                    "relative grid size-10 pointer-coarse:size-11 place-items-center rounded-full border outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    active ? "border-2 border-ink" : "border-transparent",
                    state !== "available" && !active && "cursor-not-allowed opacity-40",
                    state === "soldout" && !active && STRIKE
                  )}
                >
                  <span className="size-7 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                </button>
              )
            })}
          </div>
          {hintUnder === "color" && (
            <p role="alert" className="text-label font-semibold text-destructive">
              {hintText}
            </p>
          )}
        </fieldset>

        <fieldset ref={sizeGroup} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <legend className="text-label font-semibold">Kích cỡ (Size)</legend>
            <div className="flex items-center gap-3">
              <AskSizeButton slug={product.slug} name={product.name} />
              <SizeGuideDialog rows={product.sizeChart} categoryName={product.category.name} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {sizes.map((s) => {
              const state = optionState(variants, sel, "size", s)
              const active = sel.size === s
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${s}${stateLabel(state)}`}
                  disabled={state !== "available" && !active}
                  onClick={() => pick("size", s)}
                  className={cn(
                    "relative inline-flex h-11 min-w-16 items-center justify-center overflow-hidden rounded-xl px-4 text-label font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    active ? "bg-ink text-white" : "bg-secondary text-foreground hover:bg-border",
                    state !== "available" && !active && "cursor-not-allowed text-muted-foreground opacity-40 hover:bg-secondary",
                    state === "soldout" && !active && cn("line-through", STRIKE)
                  )}
                >
                  {s}
                </button>
              )
            })}
          </div>
          {hintUnder === "size" && (
            <p role="alert" className="text-label font-semibold text-destructive">
              {hintText}
            </p>
          )}
        </fieldset>

        <div className="space-y-3">
          {/* Điện thoại: hai nút mua dính đáy màn hình khi cuộn (chừa lề phải cho nút chat nổi). */}
          <div className="flex gap-3 max-lg:sticky max-lg:bottom-0 max-lg:z-30 max-lg:-mx-4 max-lg:border-t max-lg:border-border max-lg:bg-background/95 max-lg:py-3 max-lg:pr-[4.5rem] max-lg:pl-4 max-lg:backdrop-blur">
            <Button variant="dark" size="lg" className="min-w-0 flex-1 px-4" disabled={buyDisabled} onClick={() => submit(onAddToCart)}>
              Thêm vào giỏ
            </Button>
            <Button size="lg" className="min-w-0 flex-1 px-4" disabled={buyDisabled} onClick={() => submit(onBuyNow)}>
              Mua ngay
            </Button>
            {wishlistSlot}
          </div>
          {/* Chỉ hiện khi có ý nghĩa: hết hàng hoặc sắp hết. Còn nhiều thì không nói gì. */}
          {soldOutAll ? (
            <p role="status">
              <Badge shape="tag" variant="dark">
                HẾT HÀNG
              </Badge>
            </p>
          ) : variant && variant.stock <= 0 ? (
            <p role="status" className="text-label font-semibold text-destructive">
              Hết hàng
            </p>
          ) : variant && variant.stock <= LOW_STOCK ? (
            <p role="status" className="text-label font-semibold text-warning">
              Chỉ còn {variant.stock} sản phẩm
            </p>
          ) : null}
        </div>

        {/* Các mục xổ ra kiểu tạp chí: viền trên mảnh, tiêu đề viết hoa giãn chữ, dấu +/–. */}
        <section aria-label="Chi tiết sản phẩm">
          <details open className={DETAIL}>
            <summary className={SUMMARY}>Mô tả</summary>
            <p className="mt-3 text-label leading-relaxed whitespace-pre-line text-muted-foreground">{product.description}</p>
          </details>
          <details className={DETAIL}>
            <summary className={SUMMARY}>Chất liệu và thương hiệu</summary>
            <dl className="mt-3 space-y-1.5 text-label">
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted-foreground">Chất liệu</dt>
                <dd className="font-semibold">{product.material}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 text-muted-foreground">Thương hiệu</dt>
                <dd className="font-semibold">{product.brand}</dd>
              </div>
            </dl>
          </details>
          <details className={`${DETAIL} border-b border-border-strong`}>
            <summary className={SUMMARY}>Thông tin chăm sóc</summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-label text-muted-foreground">
              {careTips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </details>
        </section>

        {product.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-label font-semibold">Tags:</span>
            {product.tags.map((t) => (
              <span key={t} className="inline-flex h-8 items-center rounded-none bg-secondary px-4 text-xs font-semibold text-sidebar-foreground">
                #{t.replace(/\s+/g, "")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const DETAIL = "group/detail border-t border-border-strong py-4"
const SUMMARY =
  "flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-[0.12em] uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring after:text-base after:leading-none after:content-['+'] group-open/detail:after:content-['–'] [&::-webkit-details-marker]:hidden"

// Đường gạch chéo cho option hết hàng.
const STRIKE =
  "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),var(--color-muted-foreground)_calc(50%-1px),var(--color-muted-foreground)_calc(50%+1px),transparent_calc(50%+1px))]"

function stateLabel(state: OptionState) {
  return state === "soldout" ? " (hết hàng)" : state === "unavailable" ? " (không có)" : ""
}
