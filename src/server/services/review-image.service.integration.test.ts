import { randomUUID } from "node:crypto"
import { access, mkdir, rm, utimes, writeFile } from "node:fs/promises"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"
import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { uploadDirFor, uploadUrl } from "@/server/uploads"
import { deleteReviewImageFiles, ORPHAN_MIN_AGE_MS, pruneOrphanReviewImages } from "./review-image.service"

/*
 * Test tích hợp: dọn file ảnh đánh giá mồ côi. File được tạo thật trong public/uploads/reviews với tên UUID riêng của test
 * và luôn được xoá sau khi xong. Thời gian sửa file được chỉnh bằng utimes để giả lập file "cũ".
 */
const fx = createFixtures()
const created: string[] = []

afterAll(async () => {
  await Promise.all(created.map((f) => rm(f, { force: true })))
  await fx.cleanup()
  await db.$disconnect()
})

const exists = (file: string) => access(file).then(() => true, () => false)

/** Tạo file ảnh giả trong thư mục reviews, `ageMs` là tuổi giả lập của nó. */
async function fakeFile(ageMs: number): Promise<{ name: string; file: string; url: string }> {
  const name = `${randomUUID()}.webp`
  const dir = uploadDirFor("reviews")
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, name)
  await writeFile(file, Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))
  const when = new Date(Date.now() - ageMs)
  await utimes(file, when, when)
  created.push(file)
  return { name, file, url: uploadUrl(name, "reviews") }
}

const DAY = ORPHAN_MIN_AGE_MS

describe("review-image.service", () => {
  it("xoá file mồ côi đã quá 24 giờ; giữ file mới và file còn được dùng", async () => {
    const variant = await fx.makeVariant(5, 100_000)
    const { user } = await fx.makeBuyer([{ variantId: variant.id, quantity: 1 }])
    const review = await db.review.create({ data: { userId: user.id, productId: variant.productId, rating: 5 } })

    const oldOrphan = await fakeFile(DAY + 60_000)
    const recentOrphan = await fakeFile(60_000) // vừa tải lên, khách có thể đang soạn đánh giá
    const oldUsed = await fakeFile(DAY + 60_000)
    await db.reviewImage.create({ data: { reviewId: review.id, url: oldUsed.url, position: 0 } })

    const { deleted } = await pruneOrphanReviewImages()
    expect(deleted).toBeGreaterThanOrEqual(1)
    expect(await exists(oldOrphan.file)).toBe(false)
    expect(await exists(recentOrphan.file)).toBe(true)
    expect(await exists(oldUsed.file)).toBe(true)
  })

  it("bỏ qua file có tên không đúng dạng UUID (không động vào file lạ trong thư mục)", async () => {
    const dir = uploadDirFor("reviews")
    await mkdir(dir, { recursive: true })
    const stray = path.join(dir, `ghi-chu-${randomUUID()}.txt`)
    await writeFile(stray, "x")
    const when = new Date(Date.now() - 3 * DAY)
    await utimes(stray, when, when)
    created.push(stray)

    await pruneOrphanReviewImages()
    expect(await exists(stray)).toBe(true)
  })

  it("deleteReviewImageFiles chỉ xoá URL đúng dạng và không ném lỗi khi file đã mất", async () => {
    const a = await fakeFile(0)
    const outside = path.join(uploadDirFor("reviews"), "..", `${randomUUID()}.webp`)
    await writeFile(outside, "x")
    created.push(outside)

    await deleteReviewImageFiles([a.url, "/uploads/reviews/../" + path.basename(outside), "/uploads/products/" + a.name, `/uploads/reviews/${randomUUID()}.webp`])
    expect(await exists(a.file)).toBe(false)
    expect(await exists(outside)).toBe(true) // URL có ".." bị bỏ qua
  })
})
