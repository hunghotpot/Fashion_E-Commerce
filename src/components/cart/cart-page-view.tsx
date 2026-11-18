"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBagIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { CartStepper } from "@/components/cart/cart-stepper"
import { Button, buttonVariants } from "@/components/ui/button"
import { VoucherBox } from "@/components/cart/voucher-box"
import { useCart, useRemoveItem } from "@/hooks/use-cart"
import { useVoucher } from "@/hooks/use-voucher"
import { EMPTY_CART, summarizeCart } from "@/lib/cart"
import { formatVnd } from "@/lib/format"
import { sourceToQuery, type OrderSource } from "@/lib/order-source"
import { calculateShippingFee } from "@/lib/shipping"

// Trang giỏ hàng: cột trái = bảng sản phẩm, cột phải = card "Tóm tắt đơn hàng".
const ROW = "md:grid md:grid-cols-[minmax(0,1fr)_100px_110px_110px_36px] md:items-center md:gap-3"

/** `freeShippingThreshold`: ngưỡng miễn phí vận chuyển theo hạng của khách; `flatShippingFee`: phí đồng giá (server tính từ ShopSettings). */
export function CartPageView({ freeShippingThreshold, flatShippingFee }: { freeShippingThreshold: number; flatShippingFee: number }) {
  const { data } = useCart()
  const cart = data ?? EMPTY_CART
  const { mutate: remove } = useRemoveItem()
  const hasWarnings = cart.items.some((l) => l.warnings.length > 0)

  // Chọn từng món để thanh toán. Lưu phần BỎ CHỌN (không phải phần chọn) nên dòng mới thêm vào giỏ mặc định được chọn
  // và dòng đã xoá tự biến mất khỏi tập, không cần đồng bộ.
  const [deselected, setDeselected] = useState<ReadonlySet<string>>(new Set())
  const selected = cart.items.filter((l) => !deselected.has(l.variantId))
  const allSelected = selected.length === cart.items.length
  const selectedSummary = summarizeCart(selected)
  const shippingFee = calculateShippingFee(selectedSummary.subtotal, freeShippingThreshold, flatShippingFee)
  // Cả giỏ = không gửi `items`; chọn một phần = gửi đúng các dòng đã chọn (xem src/lib/order-source.ts).
  const source: OrderSource | undefined = allSelected ? undefined : { items: selected.map((l) => l.variantId) }
  const voucher = useVoucher({ cartKey: `${selectedSummary.subtotal}-${selectedSummary.itemCount}-${sourceToQuery(source)}`, source })

  function toggleLine(variantId: string) {
    setDeselected((cur) => {
      const next = new Set(cur)
      if (next.has(variantId)) next.delete(variantId)
      else next.add(variantId)
      return next
    })
  }
  const toggleAll = () => setDeselected(allSelected ? new Set(cart.items.map((l) => l.variantId)) : new Set())

  return (
    <div className="pb-16">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="inline-block py-2 hover:text-foreground">
          Trang chủ
        </Link>
        {" / "}
        <span className="font-semibold text-foreground">Giỏ hàng của bạn</span>
      </nav>
      <h1 className="mt-6 mb-10 text-4xl font-semibold">
        Giỏ Hàng <span className="font-sans text-base font-normal text-muted-foreground">({cart.itemCount} sản phẩm)</span>
      </h1>

      {cart.items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border-strong px-6 py-20 text-center">
          <ShoppingBagIcon className="size-12 text-subtle-foreground" />
          <p className="font-heading text-2xl font-semibold">Giỏ hàng của bạn đang trống</p>
          <p className="text-label text-muted-foreground">Hãy chọn vài sản phẩm bạn yêu thích nhé.</p>
          <Link href="/products" className={buttonVariants({ variant: "dark", size: "md" })}>
            Tiếp tục mua sắm
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_470px] xl:gap-12">
          <div className="min-w-0 space-y-4">
            {hasWarnings && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-label text-warning">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                Một số sản phẩm đã thay đổi giá hoặc tồn kho. Vui lòng kiểm tra lại trước khi thanh toán.
              </p>
            )}

            <label className="flex w-fit cursor-pointer items-center gap-3 text-label font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="size-5 accent-[var(--color-ink)]"
              />
              Chọn tất cả ({selected.length}/{cart.items.length} sản phẩm)
            </label>

            <div className={`${ROW} hidden rounded-xl bg-surface px-6 py-4 text-label font-semibold text-muted-foreground`}>
              <span>SẢN PHẨM</span>
              <span className="text-center">ĐƠN GIÁ</span>
              <span className="text-center">SỐ LƯỢNG</span>
              <span className="text-center">THÀNH TIỀN</span>
              <span />
            </div>

            <ul className="space-y-4">
              {cart.items.map((line) => (
                <li key={line.variantId} className={`${ROW} relative rounded-2xl border border-border bg-card p-5`}>
                  <div className="flex min-w-0 gap-4 max-md:pr-10 md:gap-5">
                    <input
                      type="checkbox"
                      checked={!deselected.has(line.variantId)}
                      onChange={() => toggleLine(line.variantId)}
                      aria-label={`Chọn ${line.name} để thanh toán`}
                      className="mt-1 size-5 shrink-0 accent-[var(--color-ink)]"
                    />
                    <Link
                      href={`/products/${line.slug}`}
                      className="relative block h-[98px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-secondary"
                    >
                      {line.image ? (
                        <Image src={line.image.url} alt={line.image.alt} fill sizes="88px" className="object-cover" />
                      ) : (
                        <span className="grid h-full place-items-center text-2xs text-subtle-foreground">[Ảnh SP]</span>
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-col items-start gap-1.5">
                      <Link href={`/products/${line.slug}`} className="text-nav font-semibold hover:text-primary">
                        {line.name}
                      </Link>
                      <p className="text-label text-muted-foreground">
                        Size: <b className="text-foreground">{line.size}</b> | Màu: <b className="text-foreground">{line.color}</b>
                      </p>
                      {line.warnings.map((w) => (
                        <p key={w.code} className="text-xs font-semibold text-warning">
                          {w.message}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 md:mt-0 md:contents">
                    <span className="text-nav font-semibold whitespace-nowrap md:text-center">{formatVnd(line.unitPrice)}</span>
                    <div className="md:flex md:justify-center">
                      <CartStepper line={line} />
                    </div>
                    <span className="text-nav font-semibold whitespace-nowrap text-primary md:text-center">{formatVnd(line.lineTotal)}</span>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      aria-label={`Xóa ${line.name} khỏi giỏ`}
                      onClick={() => remove({ variantId: line.variantId })}
                      className="text-subtle-foreground max-md:absolute max-md:top-4 max-md:right-4"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <Link href="/products" className="inline-block pt-2 text-sm font-semibold hover:text-primary">
              ← Tiếp tục mua sắm
            </Link>
          </div>

          <aside aria-labelledby="order-summary" className="h-fit rounded-3xl border border-border bg-card p-8 shadow-card">
            <h2 id="order-summary" className="mb-8 text-2xl font-semibold">
              Tóm tắt đơn hàng
            </h2>

            <VoucherBox voucher={voucher} className="border-b border-border pb-8" />

            <dl className="space-y-4 border-b border-border py-8 text-sm">
              <Row label="Tổng số lượng" value={allSelected ? `${selectedSummary.itemCount} sản phẩm` : `${selectedSummary.itemCount} sản phẩm đã chọn`} />
              <Row label="Tạm tính" value={formatVnd(selectedSummary.subtotal)} />
              <Row
                label="Phí vận chuyển"
                value={shippingFee === 0 ? "Miễn phí" : formatVnd(shippingFee)}
                valueClass={shippingFee === 0 ? "text-success" : ""}
              />
              {voucher.discount > 0 && (
                <Row label={`Voucher giảm giá ${voucher.previews.PRODUCT?.code ?? ""}`} value={`-${formatVnd(voucher.discount)}`} valueClass="text-success" />
              )}
              {voucher.shippingDiscount > 0 && (
                <Row label={`Voucher vận chuyển ${voucher.previews.SHIPPING?.code ?? ""}`} value={`-${formatVnd(voucher.shippingDiscount)}`} valueClass="text-success" />
              )}
            </dl>

            <div className="pt-8">
              <div className="flex items-end justify-between gap-4">
                <span className="text-base font-semibold">Tổng cộng</span>
                <span className="text-2xl leading-none font-semibold text-primary">{formatVnd(selectedSummary.subtotal + shippingFee - voucher.totalDiscount)}</span>
              </div>
              <p className="mt-2 text-right text-xs text-subtle-foreground">(Đã bao gồm VAT nếu có)</p>
              {selected.length === 0 ? (
                <>
                  <Button size="xl" disabled className="mt-8 w-full">
                    TIẾN HÀNH THANH TOÁN
                  </Button>
                  <p role="status" className="mt-3 text-center text-xs text-muted-foreground">
                    Chọn ít nhất một sản phẩm để thanh toán.
                  </p>
                </>
              ) : (
                <Link href={`/checkout${sourceToQuery(source)}`} className={`${buttonVariants({ size: "xl" })} mt-8 w-full`}>
                  {allSelected ? "TIẾN HÀNH THANH TOÁN" : `THANH TOÁN ${selected.length} SẢN PHẨM ĐÃ CHỌN`}
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-semibold ${valueClass}`}>{value}</dd>
    </div>
  )
}


