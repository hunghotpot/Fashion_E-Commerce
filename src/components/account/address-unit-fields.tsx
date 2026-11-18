"use client"

import { useEffect, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"
import { FormField } from "@/components/auth/form-field"
import { cn } from "@/lib/cn"
import { PROVINCES } from "@/lib/vn-address"

/*
 * Chọn Tỉnh/Thành phố rồi Phường/Xã từ danh sách chuẩn (sau sáp nhập không còn quận/huyện). Dùng chung cho sổ địa chỉ và thanh toán.
 * Danh sách phường/xã tải theo tỉnh từ /api/address/wards (tĩnh, cache trình duyệt) và nhớ trong bộ nhớ nên chọn lại không tải lại.
 * Đổi tỉnh thì xoá phường/xã đã chọn. Giá trị lưu là TÊN; giá trị cũ không còn trong danh sách vẫn hiện để khách biết cần chọn lại.
 */
const PROVINCE_NAMES = PROVINCES.map((p) => p.name)
const wardCache = new Map<string, string[]>()

function useWards(province: string) {
  const [state, setState] = useState<{ province: string; wards: string[] } | null>(null)
  useEffect(() => {
    if (!province) return
    const cached = wardCache.get(province)
    if (cached) {
      setState({ province, wards: cached })
      return
    }
    let cancelled = false
    fetch(`/api/address/wards?province=${encodeURIComponent(province)}`)
      .then((r) => (r.ok ? r.json() : { wards: [] }))
      .then((d: { wards: string[] }) => {
        wardCache.set(province, d.wards)
        if (!cancelled) setState({ province, wards: d.wards })
      })
      .catch(() => !cancelled && setState({ province, wards: [] }))
    return () => {
      cancelled = true
    }
  }, [province])
  const ready = !!province && state?.province === province
  return { wards: ready ? state.wards : [], loading: !!province && !ready }
}

interface A11y {
  id: string
  "aria-invalid": boolean
  "aria-describedby"?: string
}

function UnitCombobox({
  a11y,
  items,
  value,
  onChange,
  placeholder,
  emptyText,
  disabled,
}: {
  a11y: A11y
  items: string[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  emptyText: string
  disabled?: boolean
}) {
  const options = value && !items.includes(value) ? [value, ...items] : items
  return (
    <Combobox.Root items={options} value={value || null} onValueChange={(v) => onChange((v as string | null) ?? "")} disabled={disabled}>
      <Combobox.InputGroup
        className={cn(
          "relative flex h-12 w-full items-center border border-input bg-surface focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 data-disabled:cursor-not-allowed data-disabled:opacity-50",
          a11y["aria-invalid"] && "border-destructive"
        )}
      >
        <Combobox.Input
          {...a11y}
          placeholder={placeholder}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent pl-4 text-label text-foreground outline-none placeholder:text-subtle-foreground"
        />
        {value && !disabled && (
          <Combobox.Clear aria-label="Bỏ lựa chọn" className="grid size-10 place-items-center text-muted-foreground hover:text-foreground">
            <XIcon className="size-4" />
          </Combobox.Clear>
        )}
        <Combobox.Trigger aria-label="Mở danh sách" className="grid size-10 place-items-center text-muted-foreground">
          <ChevronDownIcon className="size-5" />
        </Combobox.Trigger>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="z-[60] outline-none">
          <Combobox.Popup className="w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) border border-border bg-popover text-popover-foreground shadow-float">
            <Combobox.Empty>
              <p className="px-4 py-3 text-label text-muted-foreground">{emptyText}</p>
            </Combobox.Empty>
            <Combobox.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain py-1 outline-none data-empty:p-0">
              {(item: string) => (
                <Combobox.Item
                  key={item}
                  value={item}
                  className="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 px-3 py-2 text-label outline-none select-none data-highlighted:bg-secondary"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2">{item}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

export function AddressUnitFields({
  idPrefix,
  province,
  ward,
  onChange,
  errors,
}: {
  idPrefix: string
  province: string
  ward: string
  /** Đổi tỉnh thì `ward` được xoá (truyền ward rỗng). */
  onChange: (next: { province: string; ward: string }) => void
  errors?: { province?: string; ward?: string }
}) {
  const { wards, loading } = useWards(province)
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id={`${idPrefix}-province`} label="Tỉnh/Thành phố" required error={errors?.province}>
        {(a11y) => (
          <UnitCombobox
            a11y={a11y}
            items={PROVINCE_NAMES}
            value={province}
            onChange={(v) => onChange({ province: v, ward: v === province ? ward : "" })}
            placeholder="Chọn tỉnh/thành phố"
            emptyText="Không tìm thấy tỉnh/thành phố."
          />
        )}
      </FormField>
      <FormField id={`${idPrefix}-ward`} label="Phường/Xã" required error={errors?.ward} hint={!province ? "Chọn tỉnh/thành phố trước." : undefined}>
        {(a11y) => (
          <UnitCombobox
            a11y={a11y}
            items={wards}
            value={ward}
            onChange={(v) => onChange({ province, ward: v })}
            placeholder={loading ? "Đang tải..." : "Chọn phường/xã"}
            emptyText="Không tìm thấy phường/xã."
            disabled={!province}
          />
        )}
      </FormField>
    </div>
  )
}
