"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/cn"

/**
 * Một dòng thông tin chuyển khoản (nhãn, giá trị, nút sao chép). Nút cao 44px, đổi sang dấu tích và chữ "Đã chép" khoảng 2 giây
 * (có vùng thông báo cho trình đọc màn hình); không chép được thì báo lỗi để khách chép tay.
 */
export function CopyRow({
  label,
  value,
  copyValue = value,
  emphasis = false,
  className,
}: {
  label: string
  /** Giá trị hiển thị (có thể định dạng, vd "9999 8888 2026"). */
  value: string
  /** Giá trị đưa vào bộ nhớ tạm (không định dạng). */
  copyValue?: string
  emphasis?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Không sao chép được, vui lòng chép thủ công")
    }
  }

  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0", className)}>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className={cn("mt-0.5 font-semibold break-words tabular-nums", emphasis ? "text-xl text-primary" : "text-nav")}>{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Sao chép ${label.toLowerCase()}`}
        className={cn(
          "inline-flex h-11 min-w-[6.5rem] shrink-0 items-center justify-center gap-2 border px-3 text-label font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
          copied ? "border-success bg-success-soft text-success" : "border-border-strong bg-card text-foreground hover:bg-secondary"
        )}
      >
        {copied ? <CheckIcon className="size-4" aria-hidden /> : <CopyIcon className="size-4" aria-hidden />}
        {copied ? "Đã chép" : "Sao chép"}
      </button>
      <span role="status" className="sr-only">
        {copied ? `Đã sao chép ${label.toLowerCase()}` : ""}
      </span>
    </div>
  )
}
