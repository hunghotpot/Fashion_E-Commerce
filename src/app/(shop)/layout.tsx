import { AssistantProvider } from "@/components/assistant/assistant-provider"
import { AssistantWidget } from "@/components/assistant/assistant-widget"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { CartProvider } from "@/components/cart/cart-provider"
import { HashFocus } from "@/components/layout/hash-focus"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"
import { SkipLink } from "@/components/layout/skip-link"
import { EMPTY_CART } from "@/lib/cart"
import { getCurrentUser } from "@/server/auth/session"
import { resolveCartContext } from "@/server/cart/context"
import { getCart } from "@/server/services/cart.service"
import { getNavCategories } from "@/server/services/catalog.service"
import { getCustomerSpend } from "@/server/services/customer-spend"
import { getShopSettings } from "@/server/services/shop-settings.service"
import { getStoreProfile } from "@/server/services/store-profile.service"

// Render theo request để skeleton/streaming hoạt động và không cần DB lúc build.
export const dynamic = "force-dynamic"

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // Công tắc tổng của trợ lý AI (docs/ai/07-env-and-setup.md). Mặc định tắt: không hiện nút mở chat.
  const aiEnabled = process.env.AI_ENABLED === "true"
  const [categories, profile, user, cart] = await Promise.all([
    getNavCategories(),
    getStoreProfile(),
    getCurrentUser(),
    resolveCartContext().then((ctx) => (ctx ? getCart(ctx) : EMPTY_CART)),
  ])

  // Hạng thành viên hiện ngay trong menu tài khoản: cần tổng chi tiêu của khách (Admin không có hạng).
  const [totalSpend, settings] = await Promise.all([user?.role === "CUSTOMER" ? getCustomerSpend(user.id) : undefined, getShopSettings()])

  return (
    <CartProvider initialCart={cart}>
      <AssistantProvider enabled={aiEnabled} authenticated={!!user}>
        <SkipLink />
        <SiteHeader user={user && { name: user.name, email: user.email, role: user.role, totalSpend, tierRules: settings.tiers }} />
        <HashFocus />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-page px-4 pt-7 outline-none md:px-8">
          {children}
        </main>
        <SiteFooter categories={categories} profile={profile} />
        <CartDrawer />
        <AssistantWidget />
      </AssistantProvider>
    </CartProvider>
  )
}

