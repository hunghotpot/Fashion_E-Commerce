"use client"

import { useEffect, useOptimistic, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFilterPending } from "@/stores/product-filter-pending"

const ALL = "all"

/** Lọc theo danh mục (?categoryId=): chọn danh mục gốc thì gồm cả sản phẩm của danh mục con (service lo). Đổi lọc luôn về trang 1. */
export function CategoryFilter({ categories }: { categories: { id: string; name: string; depth: 0 | 1 }[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get("categoryId") ?? ALL
  const [isPending, startTransition] = useTransition()
  const [shown, setShown] = useOptimistic(current)
  const setPending = useFilterPending((s) => s.setPending)
  useEffect(() => setPending(isPending), [isPending, setPending])
  useEffect(() => () => setPending(false), [setPending])
  const items = [{ value: ALL, label: "Tất cả danh mục" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]

  function onChange(value: string | null) {
    const next = new URLSearchParams(params.toString())
    const picked = !value ? ALL : value
    if (picked === shown) return
    if (picked === ALL) next.delete("categoryId")
    else next.set("categoryId", picked)
    next.delete("page")
    const qs = next.toString()
    startTransition(() => {
      setShown(picked)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <Select items={items} value={shown} onValueChange={onChange}>
      <SelectTrigger aria-label="Lọc theo danh mục" className="h-11 w-52 bg-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Tất cả danh mục</SelectItem>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id} className={c.depth ? "pl-6" : "font-semibold"}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
