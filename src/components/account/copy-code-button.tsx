"use client"

import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

/** Sao chép mã voucher. Trình duyệt chặn clipboard thì báo mã để khách tự chép. */
export function CopyCodeButton({ code }: { code: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      toast.success(`Đã sao chép mã ${code}`)
    } catch {
      toast.message(`Mã của bạn: ${code}`)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Sao chép mã ${code}`}
      className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      <CopyIcon className="size-3.5" aria-hidden />
      Sao chép mã
    </button>
  )
}
