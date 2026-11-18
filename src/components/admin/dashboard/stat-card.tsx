import { cn } from "@/lib/cn"
import { Badge } from "@/components/ui/badge"

type Tone = "success" | "info" | "brand" | "warning" | "danger" | "default"

/** Hàng 4 thẻ số liệu đầu mỗi màn Admin. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{children}</div>
}

// Card bo lớn viền mảnh; nhãn nhỏ bên trái, pill màu nhạt bên phải, số lớn bên dưới kèm đơn vị nhỏ.
export function StatCard({
  label,
  value,
  unit,
  chip,
  chipTitle,
  chipTone = "default",
  accent = false,
}: {
  label: string
  value: string
  unit?: string
  chip?: string | null
  /** Giải thích chip khi rê chuột (vd "So với tháng trước"). */
  chipTitle?: string
  chipTone?: Tone
  /** Số màu brand (doanh thu). */
  accent?: boolean
}) {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-4 shadow-card sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-label font-semibold text-muted-foreground">{label}</p>
        {chip && (
          <Badge variant={chipTone} title={chipTitle}>
            {chip}
          </Badge>
        )}
      </div>
      <p className={cn("text-xl font-semibold [overflow-wrap:anywhere] sm:text-2xl", accent && "text-brand")}>
        {value}
        {unit && <span className="ml-1.5 text-label font-semibold text-muted-foreground">{unit}</span>}
      </p>
    </div>
  )
}

/** "+18.2%" / "-4%"; null khi kỳ trước chưa có số liệu (không bịa phần trăm). */
export function formatDelta(pct: number | null): { text: string; tone: Tone } | null {
  if (pct === null) return null
  const rounded = Math.round(pct * 10) / 10
  return { text: `${rounded >= 0 ? "+" : ""}${rounded}%`, tone: rounded >= 0 ? "success" : "danger" }
}
