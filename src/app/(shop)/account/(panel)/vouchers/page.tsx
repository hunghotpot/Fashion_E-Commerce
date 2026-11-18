import type { Metadata } from "next"
import Link from "next/link"
import { MyVoucherCard } from "@/components/account/my-voucher-card"
import { TierBadge } from "@/components/account/tier-badge"
import { TierProgress } from "@/components/account/tier-progress"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import { CUSTOMER_TIER_LABEL, customerTier, spendToNextTier } from "@/lib/customer-tier"
import { formatVnd } from "@/lib/format"
import { requireUser } from "@/server/auth/session"
import { getCustomerSpend } from "@/server/services/customer-spend"
import { getShopSettings } from "@/server/services/shop-settings.service"
import { listMyVouchers } from "@/server/services/voucher.service"

export const metadata: Metadata = { title: "Voucher của tôi" }

const TABS = [
  { key: "usable", label: "Dùng được" },
  { key: "used", label: "Đã dùng" },
  { key: "expired", label: "Hết hạn" },
] as const

const EMPTY: Record<(typeof TABS)[number]["key"], { title: string; hint: string }> = {
  usable: { title: "Chưa có voucher nào dùng được", hint: "Voucher mới và quà theo hạng thành viên sẽ xuất hiện ở đây." },
  used: { title: "Bạn chưa dùng voucher nào", hint: "Voucher bạn đã dùng cho đơn hàng sẽ nằm ở đây." },
  expired: { title: "Không có voucher hết hạn", hint: "Voucher quá hạn hoặc hết lượt sẽ nằm ở đây." },
}

export default async function MyVouchersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser("/account/vouchers")
  const sp = await searchParams
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "usable"
  const [vouchers, spend, settings] = await Promise.all([listMyVouchers(user.id), getCustomerSpend(user.id), getShopSettings()])
  const tier = customerTier(spend, settings.tiers)
  const next = spendToNextTier(spend, settings.tiers)
  const counts = { usable: vouchers.usable.filter((v) => !v.locked).length, used: vouchers.used.length, expired: vouchers.expired.length }
  const list = vouchers[tab]

  return (
    <section aria-labelledby="my-vouchers" className="rounded-3xl border border-border bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="my-vouchers" className="text-2xl font-semibold">
          Voucher của tôi
        </h2>
        {user.role === "CUSTOMER" && <TierBadge tier={tier} />}
      </div>
      {user.role === "CUSTOMER" && (
        <p className="mt-1 text-label text-muted-foreground">
          {next
            ? `Còn ${formatVnd(next.remaining)} nữa để lên hạng ${CUSTOMER_TIER_LABEL[next.tier]} và mở thêm ưu đãi.`
            : "Bạn đang ở hạng cao nhất."}
        </p>
      )}
      {user.role === "CUSTOMER" && <TierProgress totalSpend={spend} rules={settings.tiers} className="mt-4 max-w-md" />}

      <nav aria-label="Nhóm voucher" className="mt-6 flex border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "usable" ? "/account/vouchers" : `/account/vouchers?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 border-b-2 px-2 text-label font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/40 max-sm:flex-1 max-sm:justify-center sm:px-4",
              tab === t.key ? "border-ink text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span className="text-xs font-normal">({counts[t.key]})</span>
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <p className="text-label font-semibold">{EMPTY[tab].title}</p>
          <p className="max-w-sm text-xs text-muted-foreground">{EMPTY[tab].hint}</p>
          {tab === "usable" && (
            <Link href="/products" className={buttonVariants({ variant: "ink-outline", size: "md", className: "mt-3" })}>
              Xem sản phẩm
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((v) => (
            <li key={v.code}>
              <MyVoucherCard voucher={v} state={tab} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-xs text-subtle-foreground">
        Mỗi mã dùng một lần. Dùng được cùng lúc một mã giảm giá và một mã vận chuyển ở giỏ hàng và thanh toán.
      </p>
    </section>
  )
}
