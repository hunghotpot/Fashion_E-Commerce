"use client"

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/cn"
import { Input } from "@/components/ui/input"
import { useFilterPending } from "@/stores/product-filter-pending"

export interface ToolbarFilter {
  value: string
  label: string
}

const SEARCH_DEBOUNCE_MS = 350

/*
 * Thanh công cụ của màn danh sách: ô tìm kiếm, hàng nút lọc (nút đang chọn nền ink), chỗ đặt nút hành động bên phải.
 * Trạng thái nằm trong URL: ?q= và ?<filterParam>= (mặc định "status"); đổi bộ lọc luôn đưa về trang 1.
 * Trang (server) đọc lại searchParams và tự validate bằng Zod của nó.
 * Bấm nút lọc: nút đổi trạng thái NGAY (optimistic) và bảng bên dưới mờ + thanh tiến độ trong lúc chờ server (xem PendingFrame),
 * bấm lại đúng nút đang chọn thì bỏ qua; nhờ vậy người dùng không phải bấm nhiều lần.
 */
export function ListToolbar({
  placeholder,
  filters,
  filterParam = "status",
  allLabel = "Tất cả",
  children,
}: {
  placeholder: string
  filters?: ToolbarFilter[]
  filterParam?: string
  allLabel?: string
  /** Nút hành động bên phải (Xuất file, Thêm mới…). */
  children?: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const urlQ = params.get("q") ?? ""
  const current = params.get(filterParam) ?? ""
  const [isPending, startTransition] = useTransition()
  const [shown, setShown] = useOptimistic(current)
  const setPending = useFilterPending((s) => s.setPending)

  const [q, setQ] = useState(urlQ)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Đồng bộ khi URL đổi từ nơi khác (vd ô tìm kiếm ở header chuyển sang ?q=).
  useEffect(() => setQ(urlQ), [urlQ])
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])
  useEffect(() => setPending(isPending), [isPending, setPending])
  useEffect(() => () => setPending(false), [setPending])

  function navigate(patch: Record<string, string>, optimisticFilter?: string) {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete("page")
    const qs = next.toString()
    startTransition(() => {
      if (optimisticFilter !== undefined) setShown(optimisticFilter)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  function pick(value: string) {
    if (value === shown) return
    navigate({ [filterParam]: value }, value)
  }

  function onSearch(value: string) {
    setQ(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => navigate({ q: value.trim() }), SEARCH_DEBOUNCE_MS)
  }

  const pill = (active: boolean) =>
    cn(
      "h-11 shrink-0 rounded-xl border px-4 text-label font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
      active ? "border-ink bg-ink text-white" : "border-border bg-card text-sidebar-foreground hover:bg-secondary"
    )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        role="search"
        className="min-w-56 flex-1 basis-60"
        onSubmit={(e) => {
          e.preventDefault()
          if (timer.current) clearTimeout(timer.current)
          navigate({ q: q.trim() })
        }}
      >
        <Input
          type="search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-11 bg-card"
        />
      </form>

      {filters && filters.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
          <button type="button" aria-pressed={shown === ""} className={pill(shown === "")} onClick={() => pick("")}>
            {allLabel}
          </button>
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={shown === f.value}
              className={pill(shown === f.value)}
              onClick={() => pick(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {children && <div className="flex flex-wrap items-center gap-3 sm:ml-auto">{children}</div>}
    </div>
  )
}
