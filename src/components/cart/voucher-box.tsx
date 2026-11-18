"use client"

import { useState } from "react"
import { TicketPercentIcon, TruckIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { VoucherController } from "@/hooks/use-voucher"
import { cn } from "@/lib/cn"
import { formatVnd } from "@/lib/format"
import { VOUCHER_SLOT_LABEL, type AvailableVoucher, type VoucherSlot } from "@/lib/voucher"

const SLOTS: VoucherSlot[] = ["PRODUCT", "SHIPPING"]
const COLLAPSED_VOUCHERS = 3
const expiryFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })

/**
 * Ô nhập mã giảm giá dùng ở giỏ hàng và thanh toán. Trạng thái nằm ở `useVoucher` (truyền vào qua `voucher`).
 * Dùng được CÙNG LÚC một mã giảm giá và một mã vận chuyển; mã nhập/chọn tự vào đúng nhóm theo loại (chọn mã khác cùng nhóm sẽ thay mã cũ).
 */
export function VoucherBox({ voucher, id = "voucher", className }: { voucher: VoucherController; id?: string; className?: string }) {
  const [input, setInput] = useState("")
  const { codes, previews, errors, applyError, checking, apply, clear, available } = voucher

  function submit() {
    if (input.trim()) void apply(input).then(() => setInput(""))
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="text-label font-semibold">
        Mã giảm giá / Voucher
      </label>

      <p role="status" className="sr-only">
        {SLOTS.flatMap((slot) => (previews[slot] ? [`Đã áp ${VOUCHER_SLOT_LABEL[slot].toLowerCase()} ${previews[slot]!.code}, giảm ${formatVnd(previews[slot]!.discount)}`] : [])).join(". ")}
      </p>

      {/* Mã đang áp, mỗi nhóm một thẻ. */}
      <div className="mt-3 space-y-2 empty:hidden">
        {SLOTS.map((slot) => {
          const code = codes[slot]
          if (!code) return null
          const preview = previews[slot]
          const error = errors[slot]
          const Icon = slot === "SHIPPING" ? TruckIcon : TicketPercentIcon
          return (
            <div key={slot} className="flex items-start justify-between gap-3 border border-border bg-surface px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0 text-label">
                  <p className="font-semibold">
                    {code} <span className="text-xs font-normal text-muted-foreground">· {VOUCHER_SLOT_LABEL[slot]}</span>
                  </p>
                  {preview ? (
                    <p className="text-success">{preview.benefit}</p>
                  ) : error ? (
                    <p role="alert" className="text-xs text-destructive">
                      {error}
                    </p>
                  ) : checking ? (
                    <p className="text-muted-foreground">Đang kiểm tra...</p>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => clear(slot)}
                aria-label={`Bỏ mã ${code}`}
                className="-my-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Không dùng <form>: ô này nằm trong form thanh toán (form lồng nhau không hợp lệ), nên bắt phím Enter thủ công. */}
      <div className="mt-3 flex gap-3">
        <Input
          id={id}
          variant="white"
          size="sm"
          placeholder="Nhập mã ưu đãi..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              submit()
            }
          }}
          autoComplete="off"
          maxLength={40}
          className="h-12 uppercase placeholder:normal-case"
          aria-describedby={applyError ? `${id}-error` : undefined}
          aria-invalid={applyError ? true : undefined}
        />
        <Button type="button" onClick={submit} variant="dark" size="md" disabled={checking || !input.trim()} className="h-12">
          {checking ? "Đang kiểm tra..." : "Áp dụng"}
        </Button>
      </div>
      {applyError && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-destructive">
          {applyError}
        </p>
      )}

      {/* Voucher khách có thể chọn, chia hai nhóm; mã đã áp ở nhóm nào thì ẩn khỏi danh sách nhóm đó. */}
      {SLOTS.map((slot) => (
        <VoucherSection
          key={slot}
          slot={slot}
          vouchers={available.filter((v) => v.slot === slot && v.code !== codes[slot])}
          busy={checking}
          onApply={(code) => void apply(code)}
        />
      ))}

      <p className="mt-3 text-xs text-subtle-foreground">
        Dùng được cùng lúc một mã giảm giá và một mã vận chuyển. Mỗi mã dùng một lần, áp dụng cho thanh toán khi nhận hàng (COD) và chuyển khoản.
      </p>
    </div>
  )
}

function VoucherSection({
  slot,
  vouchers,
  busy,
  onApply,
}: {
  slot: VoucherSlot
  vouchers: AvailableVoucher[]
  busy: boolean
  onApply: (code: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  if (vouchers.length === 0) return null
  // Thu gọn: 3 voucher đầu (dùng được xếp trước); "Xem thêm" mở hết, nhiều thì cuộn trong khung.
  const shown = showAll ? vouchers : vouchers.slice(0, COLLAPSED_VOUCHERS)
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold text-muted-foreground">
        {VOUCHER_SLOT_LABEL[slot]} dành cho bạn ({vouchers.length})
      </p>
      <ul className={cn("mt-2 space-y-2", showAll && vouchers.length > 6 && "max-h-[22rem] overflow-y-auto pr-1")}>
        {shown.map((v) => (
          <li key={v.code}>
            <VoucherCard voucher={v} busy={busy} onApply={() => onApply(v.code)} />
          </li>
        ))}
      </ul>
      {vouchers.length > COLLAPSED_VOUCHERS && (
        <button
          type="button"
          onClick={() => setShowAll((x) => !x)}
          aria-expanded={showAll}
          className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {showAll ? "Thu gọn" : `Xem thêm (${vouchers.length - COLLAPSED_VOUCHERS})`}
        </button>
      )}
    </div>
  )
}

function VoucherCard({ voucher: v, busy, onApply }: { voucher: AvailableVoucher; busy: boolean; onApply: () => void }) {
  const meta = [v.condition, v.expiresAt ? `HSD ${expiryFmt.format(new Date(v.expiresAt))}` : ""].filter(Boolean).join(" · ")
  return (
    <div className={cn("flex flex-wrap border border-border bg-card", !v.eligible && "opacity-80")}>
      <div
        className={cn(
          "grid w-16 shrink-0 place-items-center px-1 text-center text-label font-semibold",
          v.eligible ? "bg-brand-soft text-brand-strong" : "bg-secondary text-muted-foreground"
        )}
      >
        {v.stub}
      </div>
      <div className="min-w-0 flex-1 basis-40 px-3 py-2 text-label">
        <p className="flex flex-wrap items-center gap-x-2">
          <b className="font-semibold">{v.code}</b>
          {v.best && <span className="bg-success-soft px-2 text-2xs font-semibold text-success">Tiết kiệm nhất</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {v.benefit}
          {v.eligible && v.type !== "CASH" && v.discount > 0 && ` · giảm ${formatVnd(v.discount)} cho đơn này`}
        </p>
        {meta && <p className="text-xs text-subtle-foreground">{meta}</p>}
        {!v.eligible && v.reason && <p className="text-xs font-semibold text-destructive">{v.reason}</p>}
      </div>
      {/* Hẹp (điện thoại): nút xuống dòng riêng, rộng hết thẻ, cao 44px để dễ bấm. */}
      <div className="flex items-center pr-3 max-sm:basis-full max-sm:px-3 max-sm:pb-3">
        <Button type="button" variant="ink-outline" size="md" className="max-sm:w-full" disabled={!v.eligible || busy} onClick={onApply} aria-label={`Áp dụng mã ${v.code}`}>
          {v.eligible ? "Áp dụng" : "Chưa dùng được"}
        </Button>
      </div>
    </div>
  )
}
