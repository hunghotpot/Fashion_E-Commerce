"use client"

import { StarIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { RATING_LABEL } from "@/lib/review"

/*
 * Chọn số sao bằng nhóm radio gốc của trình duyệt: Tab vào nhóm, phím mũi tên đổi sao, đọc được bằng trình đọc màn hình.
 * Mỗi sao là vùng bấm 44×44; sao từ 1 đến mức đã chọn được tô. Mức đang chọn còn hiện bằng chữ bên phải (không chỉ dựa vào màu).
 */
export function RatingInput({
  value,
  onChange,
  invalid = false,
  describedBy,
  disabled = false,
}: {
  value: number
  onChange: (rating: number) => void
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}) {
  return (
    <fieldset className="space-y-2" disabled={disabled} aria-describedby={describedBy}>
      <legend className="text-label font-semibold">
        Số sao <span aria-hidden className="text-destructive">*</span>
        <span className="sr-only">(bắt buộc)</span>
      </legend>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <label
              key={n}
              className={cn(
                "relative grid size-11 cursor-pointer place-items-center rounded-lg has-focus-visible:ring-3 has-focus-visible:ring-ring",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <input
                type="radio"
                name="rating"
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <span className="sr-only">{`${n} sao, ${RATING_LABEL[n]}`}</span>
              <StarIcon aria-hidden className={cn("size-7 transition-colors motion-reduce:transition-none", n <= value ? "fill-brand text-brand" : "text-subtle-foreground")} />
            </label>
          ))}
        </div>
        <span aria-live="polite" className={cn("min-h-5 text-label", invalid ? "font-semibold text-destructive" : "text-muted-foreground")}>
          {value > 0 ? RATING_LABEL[value as 1 | 2 | 3 | 4 | 5] : "Chưa chọn"}
        </span>
      </div>
    </fieldset>
  )
}
