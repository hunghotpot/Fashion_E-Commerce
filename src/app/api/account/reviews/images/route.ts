import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/server/auth/session"
import { maybePruneOrphanReviewImages } from "@/server/services/review-image.service"
import { checkUploadBytes, generateUploadName, REVIEW_IMAGE_MAX_BYTES, uploadDirFor, uploadUrl } from "@/server/uploads"

export const runtime = "nodejs"

// Phần multipart ngoài dung lượng file (boundary, tên trường…): dư ra để không từ chối nhầm; file thật vẫn bị chặn riêng ở dưới.
const MAX_BODY_BYTES = REVIEW_IMAGE_MAX_BYTES + 64 * 1024

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
 * POST multipart, trường "file" (đúng 1 ảnh): chỉ người đã đăng nhập. Ảnh CHƯA gắn vào đánh giá nào: route chỉ ghi file và trả { url };
 * khi khách bấm "Gửi đánh giá", Server Action mới gắn các URL này vào (và kiểm đúng dạng URL, tối đa 3 ảnh).
 * Ảnh tải lên mà không được gửi đi sẽ bị dọn tự động sau 24 giờ (review-image.service).
 * Trình duyệt đã thu nhỏ và nén; server vẫn kiểm lại: dung lượng, magic bytes (JPEG/PNG/WebP), tên file do server sinh,
 * Content-Type/tên/đuôi của client bị bỏ qua hoàn toàn.
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
  if (file.size > REVIEW_IMAGE_MAX_BYTES) return fail(413, `Ảnh quá lớn (tối đa ${Math.round(REVIEW_IMAGE_MAX_BYTES / 1024)}KB)`)

  const buf = new Uint8Array(await file.arrayBuffer())
  const checked = checkUploadBytes(buf, REVIEW_IMAGE_MAX_BYTES)
  if (!checked.ok) return fail(415, checked.message)

  const dir = uploadDirFor("reviews")
  await mkdir(dir, { recursive: true })
  const name = generateUploadName(checked.type)
  await writeFile(path.join(dir, name), buf, { flag: "wx" }) // an toàn: `name` là UUID + đuôi do server sinh

  maybePruneOrphanReviewImages() // dọn nền file mồ côi cũ, tối đa mỗi giờ một lần
  return NextResponse.json({ url: uploadUrl(name, "reviews") }, { status: 201 })
}
