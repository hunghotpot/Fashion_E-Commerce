import "server-only"
import { readdir, stat, unlink } from "node:fs/promises"
import path from "node:path"
import { REVIEW_IMAGE_URL } from "@/lib/review"
import { db } from "@/server/db"
import { isSafeUploadName, uploadDirFor, uploadUrl } from "@/server/uploads"

/*
 * File ảnh đánh giá trên đĩa (public/uploads/reviews).
 * - deleteReviewImageFiles: xoá các file không còn dùng (đổi/xoá ảnh, xoá đánh giá). Chỉ nhận đúng dạng URL server sinh nên không thể xoá file ngoài thư mục.
 * - pruneOrphanReviewImages: dọn file mồ côi, tức file khách đã tải lên nhưng không bao giờ gửi đánh giá, hoặc còn sót khi người dùng/sản phẩm bị xoá.
 *   Chỉ xoá file CŨ HƠN 24 giờ và không có dòng ReviewImage nào trỏ tới, nên ảnh vừa tải lên (đang soạn đánh giá) không bao giờ bị xoá nhầm.
 * - maybePruneOrphanReviewImages: gọi nền sau mỗi lần tải ảnh, tối đa mỗi giờ một lần trong một tiến trình; không bao giờ làm hỏng request.
 */

export const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000
const PRUNE_INTERVAL_MS = 60 * 60 * 1000

export async function deleteReviewImageFiles(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      if (!REVIEW_IMAGE_URL.test(url)) return
      try {
        await unlink(path.join(uploadDirFor("reviews"), path.basename(url)))
      } catch {
        /* file đã mất hoặc không xoá được: không ảnh hưởng người dùng */
      }
    })
  )
}

/** Xoá file mồ côi cũ hơn 24 giờ; trả số file đã xoá. `now` để test. */
export async function pruneOrphanReviewImages(now: Date = new Date()): Promise<{ deleted: number }> {
  const dir = uploadDirFor("reviews")
  let names: string[]
  try {
    names = (await readdir(dir)).filter(isSafeUploadName)
  } catch {
    return { deleted: 0 } // chưa có thư mục = chưa có ảnh nào
  }

  const old: string[] = []
  for (const name of names) {
    try {
      if (now.getTime() - (await stat(path.join(dir, name))).mtimeMs > ORPHAN_MIN_AGE_MS) old.push(name)
    } catch {
      /* file vừa bị xoá bởi tiến trình khác */
    }
  }
  if (old.length === 0) return { deleted: 0 }

  const used = new Set(
    (await db.reviewImage.findMany({ where: { url: { in: old.map((n) => uploadUrl(n, "reviews")) } }, select: { url: true } })).map((r) => r.url)
  )
  const orphans = old.filter((n) => !used.has(uploadUrl(n, "reviews")))
  await deleteReviewImageFiles(orphans.map((n) => uploadUrl(n, "reviews")))
  return { deleted: orphans.length }
}

let lastPruneAt = 0

/** Dọn nền, có giới hạn tần suất; lỗi bị nuốt vì đây chỉ là dọn dẹp. */
export function maybePruneOrphanReviewImages(now: number = Date.now()): void {
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return
  lastPruneAt = now
  void pruneOrphanReviewImages(new Date(now)).catch(() => {})
}
