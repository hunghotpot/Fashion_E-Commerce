"use client"

import { useEffect, useMemo, useState } from "react"
import { InfoIcon, MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { ProductGallery } from "@/components/product/product-gallery"
import { AskSizeButton } from "@/components/assistant/ask-size-button"
import { SizeGuideDialog } from "@/components/product/size-guide-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MAX_LINE_QUANTITY } from "@/lib/cart"
import { formatVnd, GENDER_LABEL, STYLE_LABEL } from "@/lib/format"
import {
  findVariant,
  imagesForColor,
  initialSelection,
  listColors,
  listSizes,
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

// Phần tương tác của trang chi tiết : gallery | tên, giá, màu, size, số lượng, nút mua, mô tả, tags.
// Thuần giao diện: giỏ hàng được nối ở ProductDetailConnected qua onAddToCart / onBuyNow.
export function ProductDetailMain({
  product,
  careTips,
  onAddToCart,
  onBuyNow,
}: {
  product: ProductDetail
  careTips: string[]
  onAddToCart?: (item: CartItemInput) => void
  onBuyNow?: (item: CartItemInput) => void
}) {
  const { variants } = product
  const [sel, setSel] = useState<Selection>(() => initialSelection(variants))
  const [qty, setQty] = useState(1)

  const colors = useMemo(() => listColors(variants), [variants])
  const sizes = useMemo(() => listSizes(variants), [variants])
  const variant = findVariant(variants, sel)
  const range = priceRange(variants, sel)
  const images = imagesForColor(product.images, sel.color)

  // Tồn kho: biến thể đang chọn, hoặc tổng của các biến thể khớp lựa chọn dở dang.
  const stock = variant
    ? variant.stock
    : variants
        .filter((v) => (!sel.color || v.color === sel.color) && (!sel.size || v.size === sel.size))
        .reduce((sum, v) => sum + v.stock, 0)
  const soldOutAll = variants.every((v) => v.stock <= 0)
  const canBuy = !!variant && variant.stock > 0
  const maxQty = variant ? Math.max(1, Math.min(variant.stock, MAX_LINE_QUANTITY)) : MAX_LINE_QUANTITY
  const quantity = Math.min(qty, maxQty)
  // Bản nháp chỉ có khi đang gõ vào ô số lượng; null = hiện `quantity` thật. Xác nhận khi Enter hoặc rời ô.
  const [qtyDraft, setQtyDraft] = useState<string | null>(null)
  function commitQty() {
    if (qtyDraft === null) return
    const typed = Number.parseInt(qtyDraft, 10)
    setQtyDraft(null)
    if (!Number.isNaN(typed)) setQty(Math.min(Math.max(typed, 1), maxQty))
  }

  // Bấm lại giá trị đang chọn = bỏ chọn (để đổi sang màu/size không có tổ hợp với lựa chọn kia).
  function pick(axis: Axis, value: string) {
    setSel((cur) => {
      if (cur[axis] === value) {
        const rest = { ...cur }
        delete rest[axis]
        return rest
      }
      return select(variants, cur, axis, value)
    })
  }

  // Trợ lý gợi ý size và khách bấm "Chọn size": chọn đúng size đó nếu còn bán (bỏ qua nếu đã chọn rồi).
  const sizeRequest = useAssistantUi((s) => s.sizeRequest)
  useEffect(() => {
    if (!sizeRequest || !sizes.includes(sizeRequest.size)) return
    setSel((cur) => (cur.size === sizeRequest.size ? cur : select(variants, cur, "size", sizeRequest.size)))
  }, [sizeRequest, sizes, variants])

  const subtitle = [product.category.name, GENDER_LABEL[product.gender], STYLE_LABEL[product.style] ?? product.style]
  const item = variant ? { variantId: variant.id, quantity } : null

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
      <ProductGallery key={sel.color ?? "all"} images={images} name={product.name} />

      {/* Cột thông tin dính khi cuộn trên máy tính để vẫn thấy nút mua khi xem hết các ảnh. */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        <div className="space-y-3 border-b border-border pb-6">
          <h1 className="text-4xl leading-tight font-semibold text-balance">{product.name}</h1>
          <p className="text-label text-muted-foreground">{subtitle.join(" • ")}</p>
          <p className="pt-1 text-2xl font-semibold text-primary" aria-live="polite">
            {range.min === range.max ? formatVnd(range.min) : `${formatVnd(range.min)} – ${formatVnd(range.max)}`}
          </p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-label font-semibold">
            Màu sắc: <span className="font-normal text-muted-foreground">{sel.color ?? "Chưa chọn"}</span>
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
                    "relative grid size-10 pointer-coarse:size-11 place-items-center rounded-full border outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
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
        </fieldset>

        <fieldset className="space-y-3">
          <div className="flex items-center justify-between">
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
                    "relative inline-flex h-11 min-w-[72px] items-center justify-center overflow-hidden rounded-xl px-4 text-label font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
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
        </fieldset>

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-label font-semibold">Số lượng</p>
            <div className="flex h-[52px] w-fit items-center rounded-xl bg-secondary">
              <button
                type="button"
                aria-label="Giảm số lượng"
                disabled={quantity <= 1}
                onClick={() => setQty(quantity - 1)}
                className="grid h-full w-11 place-items-center disabled:opacity-40"
              >
                <MinusIcon className="size-3.5" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Số lượng"
                value={qtyDraft ?? String(quantity)}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setQtyDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
                onBlur={commitQty}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    e.currentTarget.blur()
                  } else if (e.key === "Escape") setQtyDraft(null)
                }}
                className="h-full w-12 bg-transparent text-center text-sm font-semibold outline-none focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                type="button"
                aria-label="Tăng số lượng"
                disabled={!variant || quantity >= maxQty}
                onClick={() => setQty(quantity + 1)}
                className="grid h-full w-11 place-items-center disabled:opacity-40"
              >
                <PlusIcon className="size-3.5" />
              </button>
            </div>
          </div>
          {/* Mobile: hai nút mua dính đáy màn hình khi cuộn (chừa lề phải cho nút chat nổi). */}
          <div className="flex gap-3 max-lg:sticky max-lg:bottom-0 max-lg:z-30 max-lg:-mx-4 max-lg:border-t max-lg:border-border max-lg:bg-background/95 max-lg:py-3 max-lg:pr-[4.5rem] max-lg:pl-4 max-lg:backdrop-blur">
            <Button
              variant="dark"
              size="lg"
              className="min-w-0 flex-1 px-4"
              disabled={!canBuy}
              onClick={() => item && onAddToCart?.(item)}
            >
              Thêm vào giỏ
            </Button>
            <Button
              size="lg"
              className="min-w-0 flex-1 px-4"
              disabled={!canBuy}
              onClick={() => item && onBuyNow?.(item)}
            >
              Mua ngay
            </Button>
          </div>
          <p className="text-label" aria-live="polite">
            {soldOutAll ? (
              <Badge shape="tag" variant="dark">
                HẾT HÀNG
              </Badge>
            ) : !variant ? (
              <span className="inline-flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2 text-brand-strong">
                <InfoIcon className="size-4 shrink-0" aria-hidden />
                {sel.color || sel.size ? `Còn ${stock} sản phẩm · ` : ""}Vui lòng chọn đủ màu và size
              </span>
            ) : variant.stock <= 0 ? (
              <span className="font-semibold text-destructive">Hết hàng</span>
            ) : variant.stock <= LOW_STOCK ? (
              <span className="font-semibold text-warning">Chỉ còn {variant.stock} sản phẩm</span>
            ) : (
              <span className="text-success">Còn {variant.stock} sản phẩm</span>
            )}
            {variant && <span className="ml-3 text-xs text-subtle-foreground">SKU: {variant.sku}</span>}
          </p>
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
  "flex cursor-pointer list-none items-center justify-between text-xs font-semibold tracking-[0.12em] uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/40 after:text-base after:leading-none after:content-['+'] group-open/detail:after:content-['–'] [&::-webkit-details-marker]:hidden"

// Đường gạch chéo cho option hết hàng.
const STRIKE =
  "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),var(--color-muted-foreground)_calc(50%-1px),var(--color-muted-foreground)_calc(50%+1px),transparent_calc(50%+1px))]"

function stateLabel(state: OptionState) {
  return state === "soldout" ? " (hết hàng)" : state === "unavailable" ? " (không có)" : ""
}

