import Link from "next/link"
import { AccountSidebar } from "@/components/account/account-sidebar"
import { PendingFrame } from "@/components/layout/pending-frame"
import { requireUser } from "@/server/auth/session"
import { getCustomerSpend } from "@/server/services/customer-spend"
import { countOrders } from "@/server/services/order.service"
import { getShopSettings } from "@/server/services/shop-settings.service"

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account/profile")
  const [orderCount, totalSpend, settings] = await Promise.all([countOrders(user.id), getCustomerSpend(user.id), getShopSettings()])

  return (
    <div className="pb-16">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="inline-block py-2 hover:text-foreground">
          Trang chủ
        </Link>
        {" / "}
        <span className="font-semibold text-foreground">Tài khoản khách hàng</span>
      </nav>
      <h1 className="mt-6 mb-10 text-4xl font-semibold">Thông Tin Khách Hàng</h1>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] xl:gap-10">
        <AccountSidebar user={user} orderCount={orderCount} totalSpend={totalSpend} tierRules={settings.tiers} />
        <PendingFrame className="min-w-0">
          <div className="space-y-8">{children}</div>
        </PendingFrame>
      </div>
    </div>
  )
}
