"use server"

import { revalidatePath } from "next/cache"
import type { AvatarData } from "@/lib/avatar"
import { getCurrentUser } from "@/server/auth/session"
import { AvatarError, removeAvatar, saveAvatarChoice } from "@/server/services/avatar.service"

export type AvatarActionResult = { ok: true; avatar: AvatarData; message: string } | { ok: false; message: string }

const NOT_SIGNED_IN: AvatarActionResult = { ok: false, message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại" }

/** Ảnh hiện ở header, sidebar và Admin, nên làm mới cả hai nhóm trang. */
function refresh() {
  revalidatePath("/", "layout")
  revalidatePath("/admin", "layout")
}

/** Chọn chữ cái đầu (kèm màu) hoặc ảnh tạo sẵn cho CHÍNH người đang đăng nhập. */
export async function saveAvatarChoiceAction(input: unknown): Promise<AvatarActionResult> {
  const user = await getCurrentUser()
  if (!user) return NOT_SIGNED_IN
  try {
    const avatar = await saveAvatarChoice(user.id, input as Parameters<typeof saveAvatarChoice>[1])
    refresh()
    return { ok: true, avatar, message: "Đã đổi ảnh đại diện" }
  } catch (e) {
    if (e instanceof AvatarError) return { ok: false, message: e.message }
    throw e
  }
}

/** Gỡ ảnh tải lên hoặc ảnh tạo sẵn, quay về chữ cái đầu. */
export async function removeAvatarAction(): Promise<AvatarActionResult> {
  const user = await getCurrentUser()
  if (!user) return NOT_SIGNED_IN
  try {
    const avatar = await removeAvatar(user.id)
    refresh()
    return { ok: true, avatar, message: "Đã về chữ cái đầu" }
  } catch (e) {
    if (e instanceof AvatarError) return { ok: false, message: e.message }
    throw e
  }
}
