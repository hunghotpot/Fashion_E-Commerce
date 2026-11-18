"use server"

import { revalidatePath } from "next/cache"
import type { AdminActionResult } from "@/lib/admin-action"
import { adminIdSchema } from "@/lib/validators/admin-catalog"
import { voucherInputSchema } from "@/lib/validators/admin-voucher"
import { getAdminUser, NOT_ADMIN_MESSAGE } from "@/server/auth/admin"
import { AdminCatalogError } from "@/server/services/admin-catalog.service"
import { listCustomers } from "@/server/services/admin-customer.service"
import { createVoucher, deleteVoucher, setVoucherActive, updateVoucher } from "@/server/services/admin-voucher.service"

const done = (message: string): AdminActionResult => {
  revalidatePath("/admin/vouchers")
  return { ok: true, message }
}

export async function createVoucherAction(input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const parsed = voucherInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }

  try {
    // Truyền input gốc: service tự parse lại (đầu ra của schema không còn là đầu vào hợp lệ).
    await createVoucher({ userId: admin.id }, input as Parameters<typeof createVoucher>[1])
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  return done("Đã tạo voucher")
}

export async function updateVoucherAction(voucherId: unknown, input: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const id = adminIdSchema.safeParse(voucherId)
  if (!id.success) return { ok: false, message: "Voucher không hợp lệ" }
  const parsed = voucherInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }

  try {
    await updateVoucher({ userId: admin.id }, id.data, input as Parameters<typeof updateVoucher>[2])
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  return done("Đã cập nhật voucher")
}

export async function setVoucherActiveAction(voucherId: unknown, isActive: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const id = adminIdSchema.safeParse(voucherId)
  if (!id.success || typeof isActive !== "boolean") return { ok: false, message: "Yêu cầu không hợp lệ" }

  try {
    await setVoucherActive({ userId: admin.id }, id.data, isActive)
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  return done(isActive ? "Đã bật voucher" : "Đã tắt voucher")
}

export async function deleteVoucherAction(voucherId: unknown): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }

  const id = adminIdSchema.safeParse(voucherId)
  if (!id.success) return { ok: false, message: "Voucher không hợp lệ" }

  try {
    await deleteVoucher({ userId: admin.id }, id.data)
  } catch (e) {
    if (e instanceof AdminCatalogError) return { ok: false, message: e.message }
    throw e
  }
  return done("Đã xoá voucher")
}

export interface CustomerOption {
  id: string
  name: string
  email: string
}

/** Tìm khách theo tên/email/SĐT để gán voucher riêng (tối đa 8 kết quả). Chỉ Admin; từ khoá quá ngắn trả rỗng. */
export async function searchCustomersForVoucherAction(query: unknown): Promise<CustomerOption[]> {
  const admin = await getAdminUser()
  if (!admin) return []
  const q = typeof query === "string" ? query.trim().slice(0, 100) : ""
  if (q.length < 2) return []
  const { items } = await listCustomers({ q, pageSize: 8 })
  return items.map((c) => ({ id: c.id, name: c.name, email: c.email }))
}
