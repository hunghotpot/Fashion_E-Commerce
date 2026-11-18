import type { Metadata } from "next"
import { DemoBanner } from "@/components/admin/placeholder/demo-banner"
import { ShippingStockForm, TierSettingsForm } from "@/components/admin/settings/shop-rules-forms"
import { SettingsTabs } from "@/components/admin/settings/settings-tabs"
import { defaultFreeShippingThreshold } from "@/lib/shop-settings"
import { listWelcomeVouchersByTier } from "@/server/services/admin-shop-settings.service"
import { getPaymentAccount } from "@/server/services/payment-account.service"
import { getShopSettings } from "@/server/services/shop-settings.service"
import { getStoreProfile } from "@/server/services/store-profile.service"
import { AdminAccountsPanel, PaymentPanel, StorePanel } from "@/components/admin/settings/settings-panels"

export const metadata: Metadata = { title: "Cài đặt hệ thống" }

/* Lưu thật: thông tin cửa hàng (StoreProfile), tài khoản nhận chuyển khoản (PaymentAccount), phí ship, tồn kho và hạng thành viên (ShopSettings).
   Tab phân quyền Admin vẫn là giao diện minh hoạ (nút ghi chỉ hiện toast "chưa kết nối"). */
export default async function AdminSettingsPage() {
  const [profile, account, settings, welcome] = await Promise.all([getStoreProfile(), getPaymentAccount(), getShopSettings(), listWelcomeVouchersByTier()])
  return (
    <>
      <DemoBanner message="Thông tin cửa hàng, tài khoản nhận chuyển khoản, vận chuyển, tồn kho và hạng thành viên lưu được. Tab Phân quyền Admin là giao diện minh hoạ, chưa kết nối dữ liệu" />
      <SettingsTabs
        store={<StorePanel profile={profile} settings={settings} />}
        payment={<PaymentPanel account={account} />}
        shipping={<ShippingStockForm settings={settings} freeShippingFrom={defaultFreeShippingThreshold(settings)} />}
        tiers={<TierSettingsForm settings={settings} welcome={welcome} />}
        admins={<AdminAccountsPanel />}
      />
    </>
  )
}
