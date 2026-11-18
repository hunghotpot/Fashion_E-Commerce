"use server"

import { revalidatePath } from "next/cache"
import type { AdminActionResult } from "@/lib/admin-action"
import { paymentAccountSchema } from "@/lib/validators/admin-payment"
import { shippingStockSettingsSchema, tierSettingsSchema } from "@/lib/validators/admin-shop-settings"
import { storeProfileSchema } from "@/lib/validators/admin-settings"
import { getAdminUser, NOT_ADMIN_MESSAGE } from "@/server/auth/admin"
import { AdminCatalogError } from "@/server/services/admin-catalog.service"
import { updatePaymentAccount } from "@/server/services/admin-payment-account.service"
import { previewTierImpact, updateShippingStockSettings, updateTierSettings, type TierImpact } from "@/server/services/admin-shop-settings.service"
import { updateStoreProfile } from "@/server/services/admin-store-profile.service"

export async function updateStoreProfileAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const parsed = storeProfileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }

  try {
    // Truyền input gốc: service tự parse lại (đầu ra của schema không còn là đầu vào hợp lệ).
    await updateStoreProfile({ userId: admin.id }, input as Parameters<typeof updateStoreProfile>[1])
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  // Thông tin này hiện ở trang Liên hệ, Giới thiệu và chân trang của mọi trang cửa hàng.
  revalidatePath("/", "layout")
  return { ok: true, message: "Đã lưu thông tin cửa hàng" }
}

export async function updatePaymentAccountAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const parsed = paymentAccountSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }

  try {
    // Truyền input gốc: service tự parse lại (đầu ra của schema không còn là đầu vào hợp lệ).
    await updatePaymentAccount({ userId: admin.id }, input as Parameters<typeof updatePaymentAccount>[1])
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  // Mã QR ở trang thanh toán của khách đọc tài khoản này.
  revalidatePath("/admin/settings")
  return { ok: true, message: "Đã lưu tài khoản nhận chuyển khoản. Mã QR dùng tài khoản mới ngay từ lần khách mở trang thanh toán tiếp theo, kể cả đơn đang chờ chuyển khoản." }
}

export async function updateShippingStockSettingsAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const parsed = shippingStockSettingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }

  try {
    await updateShippingStockSettings({ userId: admin.id }, input as Parameters<typeof updateShippingStockSettings>[1])
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  // Phí ship, ngưỡng tồn kho hiện ở giỏ, thanh toán, trang chính sách và các màn tồn kho của Admin.
  revalidatePath("/", "layout")
  revalidatePath("/admin", "layout")
  return { ok: true, message: "Đã lưu cài đặt vận chuyển và tồn kho" }
}

export async function updateTierSettingsAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const parsed = tierSettingsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }

  try {
    await updateTierSettings({ userId: admin.id }, input as Parameters<typeof updateTierSettings>[1])
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  revalidatePath("/", "layout")
  revalidatePath("/admin", "layout")
  return { ok: true, message: "Đã lưu cấu hình hạng thành viên. Hạng của khách được tính lại theo mức mới." }
}

/** Xem trước số khách đổi hạng nếu lưu bản nháp; null khi không phải Admin hoặc bản nháp chưa hợp lệ. */
export async function previewTierImpactAction(input: unknown): Promise<TierImpact | null> {
  const admin = await getAdminUser()
  if (!admin) return null
  if (!tierSettingsSchema.safeParse(input).success) return null
  return previewTierImpact({ userId: admin.id }, input as Parameters<typeof previewTierImpact>[1])
}
