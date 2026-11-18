import "server-only"
import { unlink } from "node:fs/promises"
import path from "node:path"
import { avatarFromRow, AVATAR_UPLOAD_URL, DEFAULT_AVATAR_COLOR, type AvatarData } from "@/lib/avatar"
import { avatarChoiceSchema, type AvatarChoiceInput } from "@/lib/validators/avatar"
import { db } from "@/server/db"
import { uploadDirFor } from "@/server/uploads"

/*
 * Đổi ảnh đại diện của CHÍNH người dùng (userId do Server Action/route lấy từ phiên, không phải tham số client).
 * Mỗi lần đổi ghi đủ các cột avatar*, cột không dùng đặt null; ảnh tải lên cũ bị xoá khỏi đĩa khi không còn dùng.
 */

const select = { avatarKind: true, avatarColor: true, avatarStyle: true, avatarSeed: true, avatarUrl: true } as const

export class AvatarError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AvatarError"
  }
}

/** Xoá file ảnh tải lên cũ. Chỉ nhận đúng dạng /uploads/avatars/<uuid>.<ext> nên không thể xoá file ngoài thư mục; lỗi xoá bị bỏ qua. */
async function deleteUploadedFile(url: string | null): Promise<void> {
  if (!url || !AVATAR_UPLOAD_URL.test(url)) return
  try {
    await unlink(path.join(uploadDirFor("avatars"), path.basename(url)))
  } catch {
    /* file đã mất hoặc không xoá được: không ảnh hưởng người dùng */
  }
}

export async function getAvatar(userId: string): Promise<AvatarData> {
  const row = await db.user.findUnique({ where: { id: userId }, select })
  if (!row) throw new AvatarError("Không tìm thấy tài khoản")
  return avatarFromRow(row)
}

/** Chọn chữ cái đầu (kèm màu) hoặc ảnh tạo sẵn. Đầu vào được kiểm lại bằng Zod ở đây (danh sách cho phép). */
export async function saveAvatarChoice(userId: string, input: AvatarChoiceInput): Promise<AvatarData> {
  const parsed = avatarChoiceSchema.safeParse(input)
  if (!parsed.success) throw new AvatarError(parsed.error.issues[0]?.message ?? "Ảnh đại diện không hợp lệ")
  const choice = parsed.data
  const before = await db.user.findUnique({ where: { id: userId }, select })
  if (!before) throw new AvatarError("Không tìm thấy tài khoản")

  const data =
    choice.kind === "INITIALS"
      ? { avatarKind: "INITIALS" as const, avatarColor: choice.color, avatarStyle: null, avatarSeed: null, avatarUrl: null }
      : { avatarKind: "GENERATED" as const, avatarStyle: choice.style, avatarSeed: choice.seed, avatarUrl: null }
  const row = await db.user.update({ where: { id: userId }, data, select })
  if (before.avatarUrl) await deleteUploadedFile(before.avatarUrl)
  return avatarFromRow(row)
}

/** Ghi ảnh tải lên (URL do server sinh ở route tải ảnh) và xoá ảnh tải lên trước đó. */
export async function saveUploadedAvatar(userId: string, url: string): Promise<AvatarData> {
  if (!AVATAR_UPLOAD_URL.test(url)) throw new AvatarError("Ảnh đại diện không hợp lệ")
  const before = await db.user.findUnique({ where: { id: userId }, select })
  if (!before) throw new AvatarError("Không tìm thấy tài khoản")
  const row = await db.user.update({
    where: { id: userId },
    data: { avatarKind: "UPLOADED", avatarUrl: url, avatarStyle: null, avatarSeed: null },
    select,
  })
  if (before.avatarUrl && before.avatarUrl !== url) await deleteUploadedFile(before.avatarUrl)
  return avatarFromRow(row)
}

/** Về chữ cái đầu (giữ màu đã chọn, chưa chọn thì màu mặc định). */
export async function removeAvatar(userId: string): Promise<AvatarData> {
  const before = await db.user.findUnique({ where: { id: userId }, select })
  if (!before) throw new AvatarError("Không tìm thấy tài khoản")
  const row = await db.user.update({
    where: { id: userId },
    data: { avatarKind: "INITIALS", avatarColor: before.avatarColor ?? DEFAULT_AVATAR_COLOR, avatarStyle: null, avatarSeed: null, avatarUrl: null },
    select,
  })
  if (before.avatarUrl) await deleteUploadedFile(before.avatarUrl)
  return avatarFromRow(row)
}
