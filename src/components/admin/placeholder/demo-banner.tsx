import { InfoIcon } from "lucide-react"

/** Biểu ngữ đầu màn hình dựng tĩnh: dữ liệu là hằng số minh hoạ, mọi nút ghi chưa kết nối backend. */
export function DemoBanner({ message = "Giao diện minh hoạ, chưa kết nối dữ liệu" }: { message?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-5 py-3 text-label font-semibold text-warning">
      <InfoIcon className="size-4 shrink-0" aria-hidden />
      {message}
    </div>
  )
}
