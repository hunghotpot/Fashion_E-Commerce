import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/server/auth/session"
import { AvatarError, saveUploadedAvatar } from "@/server/services/avatar.service"
import { AVATAR_MAX_BYTES, checkUploadBytes, generateUploadName, uploadDirFor, uploadUrl } from "@/server/uploads"

export const runtime = "nodejs"

// Phần multipart ngoài dung lượng file (boundary, tên trường…): dư ra để không từ chối nhầm; file thật vẫn bị chặn riêng ở dưới.
const MAX_BODY_BYTES = AVATAR_MAX_BYTES + 64 * 1024

const fail = (status: number, message: string) => NextResponse.json({ message }, { status })

/** Chặn form từ trang khác: nếu trình duyệt gửi Origin thì phải cùng host với yêu cầu. */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).host === (req.headers.get("host") ?? new URL(req.url).host)
  } catch {
    return false
  }
}

/*
 * POST multipart, trường "file" (đúng 1 ảnh): chỉ người đã đăng nhập, chỉ đổi ảnh của chính mình (userId lấy từ phiên).
 * Trình duyệt đã cắt vuông và nén (≈256px); server vẫn kiểm lại: dung lượng, magic bytes (JPEG/PNG/WebP), tên file do server sinh,
 * Content-Type/tên/đuôi của client bị bỏ qua hoàn toàn. Trả { avatar } theo AvatarData.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return fail(401, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại")
  if (!isSameOrigin(req)) return fail(403, "Yêu cầu không hợp lệ")

  const declared = Number(req.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail(413, "Ảnh quá lớn")

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return fail(400, "Dữ liệu tải lên không hợp lệ")
  }
  const files = form.getAll("file").filter((v): v is File => typeof v !== "string")
  if (files.length !== 1) return fail(400, "Chọn đúng một ảnh")
  const file = files[0]
  if (file.size > AVATAR_MAX_BYTES) return fail(413, `Ảnh quá lớn (tối đa ${Math.round(AVATAR_MAX_BYTES / 1024)}KB)`)

  const buf = new Uint8Array(await file.arrayBuffer())
  const checked = checkUploadBytes(buf, AVATAR_MAX_BYTES)
  if (!checked.ok) return fail(415, checked.message)

  const dir = uploadDirFor("avatars")
  await mkdir(dir, { recursive: true })
  const name = generateUploadName(checked.type)
  const filePath = path.join(dir, name) // an toàn: `name` là UUID + đuôi do server sinh
  await writeFile(filePath, buf, { flag: "wx" })
  try {
    const avatar = await saveUploadedAvatar(user.id, uploadUrl(name, "avatars"))
    return NextResponse.json({ avatar }, { status: 201 })
  } catch (e) {
    await unlink(filePath).catch(() => {}) // không để lại file mồ côi nếu ghi DB lỗi
    if (e instanceof AvatarError) return fail(400, e.message)
    throw e
  }
}
