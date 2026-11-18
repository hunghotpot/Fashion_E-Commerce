"use client"

import { useState } from "react"
import { MinusIcon, PlusIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { useUpdateQuantity } from "@/hooks/use-cart"
import { MAX_LINE_QUANTITY, type CartLine } from "@/lib/cart"

// Số lượng của một dòng giỏ: bấm +/- hoặc gõ số trực tiếp (xác nhận khi bấm Enter hoặc rời ô).
// Giảm về 1 là dừng (xoá dòng dùng nút thùng rác); số gõ vào được kẹp trong [1, min(tồn kho, 99)].
export function CartStepper({ line, className }: { line: CartLine; className?: string }) {
  const { mutate } = useUpdateQuantity()
  const max = Math.max(1, Math.min(line.stock, MAX_LINE_QUANTITY))
  const set = (quantity: number) => mutate({ variantId: line.variantId, quantity })
  // Bản nháp chỉ tồn tại khi đang gõ; null = hiện số lượng thật của giỏ (nên luôn khớp sau khi server/optimistic cập nhật).
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    if (draft === null) return
    const typed = Number.parseInt(draft, 10)
    setDraft(null)
    if (Number.isNaN(typed)) return // bỏ trống/không phải số: giữ nguyên
    const next = Math.min(Math.max(typed, 1), max)
    if (next !== line.quantity) set(next)
  }

  return (
    <div className={cn("inline-flex h-10 pointer-coarse:h-11 items-center rounded-xl bg-secondary", className)}>
      <button
        type="button"
        aria-label={`Giảm số lượng ${line.name}`}
        disabled={line.quantity <= 1}
        onClick={() => set(line.quantity - 1)}
        className="grid h-full w-9 place-items-center text-muted-foreground disabled:opacity-40"
      >
        <MinusIcon className="size-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`Số lượng ${line.name}`}
        value={draft ?? String(line.quantity)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          else if (e.key === "Escape") setDraft(null)
        }}
        className="h-full w-10 bg-transparent text-center text-sm font-semibold outline-none focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <button
        type="button"
        aria-label={`Tăng số lượng ${line.name}`}
        disabled={line.quantity >= max}
        onClick={() => set(line.quantity + 1)}
        className="grid h-full w-9 place-items-center text-muted-foreground disabled:opacity-40"
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  )
}
