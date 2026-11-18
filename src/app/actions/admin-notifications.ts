"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { AdminActionResult } from "@/lib/admin-action"
import { getAdminUser, NOT_ADMIN_MESSAGE } from "@/server/auth/admin"
import { markAdminNotificationRead, markAdminNotificationsSeen } from "@/server/services/admin-notification.service"

/** Đánh dấu toàn bộ thông báo hiện có là đã đọc, cho riêng Admin đang đăng nhập. */
export async function markAdminNotificationsSeenAction(): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }
  await markAdminNotificationsSeen(admin.id)
  return { ok: true, message: "Đã đánh dấu đã đọc" }
}

const idSchema = z.string().min(1).max(64)

/** Đánh dấu MỘT thông báo là đã đọc, cho riêng Admin đang đăng nhập (bấm vào dòng hoặc nút "Đã đọc"). */
export async function markAdminNotificationReadAction(id: string): Promise<AdminActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, message: NOT_ADMIN_MESSAGE }
  const parsed = idSchema.safeParse(id)
  if (!parsed.success) return { ok: false, message: "Thông báo không hợp lệ" }
  await markAdminNotificationRead(admin.id, parsed.data)
  revalidatePath("/admin", "layout") // làm mới số chưa đọc ở chuông (layout Admin) kể cả khi bấm dòng rồi chuyển trang
  return { ok: true, message: "Đã đánh dấu đã đọc" }
}
