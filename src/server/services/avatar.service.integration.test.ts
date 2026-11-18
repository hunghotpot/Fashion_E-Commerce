import { randomUUID } from "node:crypto"
import { access, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { afterAll, describe, expect, it, vi } from "vitest"

vi.mock("@/server/mail/send", () => ({ sendMail: vi.fn() })) // không gửi email thật

import { createFixtures } from "@/test/db-fixtures"
import { db } from "@/server/db"
import { uploadDirFor } from "@/server/uploads"
import { AvatarError, getAvatar, removeAvatar, saveAvatarChoice, saveUploadedAvatar } from "./avatar.service"

/*
 * Test tích hợp: đổi ảnh đại diện (chữ cái đầu, tạo sẵn, tải lên). File tải lên được tạo thật trong public/uploads/avatars
 * với tên UUID riêng của test và luôn được dọn sau khi xong.
 */
const fx = createFixtures()
const created: string[] = []

afterAll(async () => {
  await Promise.all(created.map((f) => rm(f, { force: true })))
  await fx.cleanup()
  await db.$disconnect()
})

async function newUser() {
  const v = await fx.makeVariant(5, 100_000)
  return (await fx.makeBuyer([{ variantId: v.id, quantity: 1 }])).user
}

/** Tạo một file ảnh giả trong thư mục avatars và trả URL công khai tương ứng. */
async function fakeUpload(): Promise<{ url: string; file: string }> {
  const name = `${randomUUID()}.webp`
  const dir = uploadDirFor("avatars")
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, name)
  await writeFile(file, Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))
  created.push(file)
  return { url: `/uploads/avatars/${name}`, file }
}

const exists = (file: string) => access(file).then(() => true, () => false)

describe("avatar.service", () => {
  it("mặc định là chữ cái đầu", async () => {
    const u = await newUser()
    expect(await getAvatar(u.id)).toMatchObject({ kind: "INITIALS", color: null, url: null })
  })

  it("chọn màu chữ cái đầu và ảnh tạo sẵn; cột không dùng bị xoá", async () => {
    const u = await newUser()
    expect(await saveAvatarChoice(u.id, { kind: "INITIALS", color: "brass" })).toMatchObject({ kind: "INITIALS", color: "brass" })
    const gen = await saveAvatarChoice(u.id, { kind: "GENERATED", style: "shapes", seed: "abc123xyz9" })
    expect(gen).toMatchObject({ kind: "GENERATED", style: "shapes", seed: "abc123xyz9", url: null })
    expect(gen.color).toBe("brass") // màu cũ được giữ để quay lại chữ cái đầu vẫn đúng màu
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } })
    expect(row).toMatchObject({ avatarKind: "GENERATED", avatarUrl: null })
  })

  it("đầu vào ngoài danh sách cho phép bị từ chối và không ghi gì", async () => {
    const u = await newUser()
    await expect(saveAvatarChoice(u.id, { kind: "GENERATED", style: "avataaars", seed: "abc123xyz9" })).rejects.toBeInstanceOf(AvatarError)
    await expect(saveAvatarChoice(u.id, { kind: "INITIALS", color: "#ff0000" })).rejects.toBeInstanceOf(AvatarError)
    await expect(saveAvatarChoice(u.id, { kind: "GENERATED", style: "shapes", seed: "../etc" })).rejects.toBeInstanceOf(AvatarError)
    expect(await getAvatar(u.id)).toMatchObject({ kind: "INITIALS" })
  })

  it("ảnh tải lên: ghi URL, đổi sang ảnh tải lên khác thì xoá file cũ", async () => {
    const u = await newUser()
    const a = await fakeUpload()
    const b = await fakeUpload()
    expect(await saveUploadedAvatar(u.id, a.url)).toMatchObject({ kind: "UPLOADED", url: a.url })
    expect(await exists(a.file)).toBe(true)
    await saveUploadedAvatar(u.id, b.url)
    expect(await exists(a.file)).toBe(false) // file cũ đã bị xoá
    expect(await exists(b.file)).toBe(true)
  })

  it("chuyển sang ảnh tạo sẵn hoặc gỡ ảnh thì xoá file tải lên; gỡ giữ màu đã chọn", async () => {
    const u = await newUser()
    await saveAvatarChoice(u.id, { kind: "INITIALS", color: "sage" })
    const a = await fakeUpload()
    await saveUploadedAvatar(u.id, a.url)
    await saveAvatarChoice(u.id, { kind: "GENERATED", style: "rings", seed: "ringsSeed01" })
    expect(await exists(a.file)).toBe(false)

    const b = await fakeUpload()
    await saveUploadedAvatar(u.id, b.url)
    const back = await removeAvatar(u.id)
    expect(back).toMatchObject({ kind: "INITIALS", color: "sage", url: null, style: null, seed: null })
    expect(await exists(b.file)).toBe(false)
  })

  it("URL ảnh tải lên sai dạng bị từ chối (không thể trỏ ra ngoài thư mục avatars)", async () => {
    const u = await newUser()
    for (const bad of ["https://evil.test/a.jpg", "/uploads/products/123e4567-e89b-42d3-a456-426614174000.jpg", "/uploads/avatars/../x.jpg", "/etc/passwd"]) {
      await expect(saveUploadedAvatar(u.id, bad)).rejects.toBeInstanceOf(AvatarError)
    }
    expect(await getAvatar(u.id)).toMatchObject({ kind: "INITIALS" })
  })

  it("tài khoản không tồn tại thì báo lỗi", async () => {
    await expect(saveAvatarChoice("khong-co", { kind: "INITIALS", color: "ink" })).rejects.toBeInstanceOf(AvatarError)
    await expect(removeAvatar("khong-co")).rejects.toBeInstanceOf(AvatarError)
  })
})
