import Link from "next/link"
import { LockIcon } from "lucide-react"
import { CopyCodeButton } from "@/components/account/copy-code-button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { MyVoucher } from "@/lib/voucher"

const dateFmt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" })
const fmt = (iso: string) => dateFmt.format(new Date(iso))

/** Thẻ voucher kiểu phiếu (ô trái nhãn mức giảm, thân giữa, hành động bên phải), cùng ngôn ngữ với thẻ trong giỏ hàng. */
export function MyVoucherCard({ voucher: v, state }: { voucher: MyVoucher; state: "usable" | "used" | "expired" }) {
  const dim = state !== "usable" || !!v.locked
  const meta = [
    v.condition,
    state === "used" && v.usedAt
      ? `Đã dùng ${fmt(v.usedAt)}${v.orderCode ? ` · đơn ${v.orderCode}` : ""}`
      : v.expiresAt
        ? `HSD ${fmt(v.expiresAt)}`
        : "Không hết hạn",
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <div className={cn("flex flex-wrap border border-border bg-card", dim && "opacity-80")}>
      <div
        className={cn(
          "grid w-20 shrink-0 place-items-center border-r border-dashed border-border-strong px-1 text-center font-heading text-2xl leading-none font-semibold",
          dim ? "bg-secondary text-muted-foreground" : v.slot === "SHIPPING" ? "bg-secondary text-foreground" : "bg-brand-soft text-brand-strong"
        )}
      >
        {v.stub}
      </div>
      <div className="min-w-0 flex-1 basis-48 px-4 py-3 text-label">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <b className="font-semibold">{v.code}</b>
          {v.audienceLabel && (
            <span className={cn("px-2 text-2xs font-semibold", v.locked ? "bg-secondary text-muted-foreground" : "bg-brand-soft text-brand-strong")}>
              {v.audienceLabel}
            </span>
          )}
          {state === "expired" && v.expiredReason && (
            <span className="bg-secondary px-2 text-2xs font-semibold text-muted-foreground">{v.expiredReason}</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {v.name} · {v.benefit}
        </p>
        <p className="text-xs text-subtle-foreground">{meta}</p>
        {v.locked && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <LockIcon className="size-3.5" aria-hidden />
            {v.locked}
          </p>
        )}
      </div>
      {state === "usable" && !v.locked && (
        <div className="flex items-center gap-3 pr-4 max-sm:basis-full max-sm:flex-wrap max-sm:px-4 max-sm:pb-3">
          <CopyCodeButton code={v.code} />
          <Link href="/cart" className={buttonVariants({ variant: "dark", size: "md" })}>
            Dùng ngay
          </Link>
        </div>
      )}
    </div>
  )
}
