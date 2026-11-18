"use client"

import { useEffect, useId, useState } from "react"
import { XIcon } from "lucide-react"
import { searchCustomersForVoucherAction, type CustomerOption } from "@/app/actions/admin-vouchers"
import { Input } from "@/components/ui/input"

/**
 * Chọn khách để gán voucher riêng: gõ tên/email/SĐT (từ 2 ký tự) rồi bấm kết quả để thêm; khách đã chọn hiện thành thẻ có nút bỏ.
 * Tìm bằng Server Action (chỉ Admin); chờ 300ms sau khi ngừng gõ để không gọi mỗi phím.
 */
export function CustomerPicker({
  selected,
  onChange,
  error,
}: {
  selected: CustomerOption[]
  onChange: (next: CustomerOption[]) => void
  error?: string
}) {
  const id = useId()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CustomerOption[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setSearching(true)
      const found = await searchCustomersForVoucherAction(q)
      if (!cancelled) {
        setResults(found)
        setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  const chosen = new Set(selected.map((c) => c.id))
  const shown = query.trim().length >= 2 ? results.filter((c) => !chosen.has(c.id)) : []

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Khách đã chọn">
          {selected.map((c) => (
            <li key={c.id} className="flex items-center gap-1 bg-secondary py-1 pl-3 text-xs font-semibold">
              <span className="max-w-48 truncate" title={c.email}>
                {c.name}
              </span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x.id !== c.id))}
                aria-label={`Bỏ ${c.name}`}
                className="grid size-9 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm khách theo tên, email hoặc SĐT..."
        aria-label="Tìm khách để gán voucher"
        aria-invalid={error ? true : undefined}
        autoComplete="off"
      />
      {searching && <p className="text-xs text-muted-foreground">Đang tìm...</p>}
      {shown.length > 0 && (
        <ul className="divide-y divide-border border border-border bg-card" aria-label="Kết quả tìm khách">
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, c])
                  setQuery("")
                  setResults([])
                }}
                className="flex min-h-11 w-full flex-col items-start justify-center px-4 py-2 text-left outline-none hover:bg-secondary focus-visible:bg-secondary"
              >
                <span className="text-label font-semibold">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!searching && query.trim().length >= 2 && shown.length === 0 && <p className="text-xs text-muted-foreground">Không tìm thấy khách phù hợp.</p>}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
