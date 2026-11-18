import { beforeEach, describe, expect, it, vi } from "vitest"

const getCurrentUser = vi.fn()
const mkdir = vi.fn()
const writeFile = vi.fn()
const unlink = vi.fn()
const saveUploadedAvatar = vi.fn()

vi.mock("@/server/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }))
vi.mock("node:fs/promises", () => ({
  mkdir: (...a: unknown[]) => mkdir(...a),
  writeFile: (...a: unknown[]) => writeFile(...a),
  unlink: (...a: unknown[]) => unlink(...a),
}))
vi.mock("@/server/services/avatar.service", () => {
  class AvatarError extends Error {}
  return { AvatarError, saveUploadedAvatar: (...a: unknown[]) => saveUploadedAvatar(...a) }
})

import { AvatarError } from "@/server/services/avatar.service"
import { AVATAR_MAX_BYTES } from "@/server/uploads"
import { POST } from "./route"

const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0])
const file = (bytes: Uint8Array | string, name = "a.webp", type = "image/webp") => new File([bytes as BlobPart], name, { type })

function request(files: File[], headers: Record<string, string> = {}) {
  const form = new FormData()
  for (const f of files) form.append("file", f)
  return new Request("http://localhost/api/account/avatar", { method: "POST", body: form, headers })
}

describe("POST /api/account/avatar", () => {
  beforeEach(() => {
    for (const m of [getCurrentUser, mkdir, writeFile, unlink, saveUploadedAvatar]) m.mockReset()
    getCurrentUser.mockResolvedValue({ id: "u1", role: "CUSTOMER" })
    unlink.mockResolvedValue(undefined)
    writeFile.mockResolvedValue(undefined)
    mkdir.mockResolvedValue(undefined)
    saveUploadedAvatar.mockImplementation(async (_id: string, url: string) => ({ kind: "UPLOADED", color: null, style: null, seed: null, url }))
  })

  it("chưa đăng nhập thì 401 và không ghi file", async () => {
    getCurrentUser.mockResolvedValue(null)
    const res = await POST(request([file(WEBP)]))
    expect(res.status).toBe(401)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("ghi file với tên UUID do server sinh vào thư mục avatars và cập nhật đúng người dùng", async () => {
    const res = await POST(request([file(WEBP, "../../evil.php", "text/html")]))
    expect(res.status).toBe(201)
    const body = (await res.json()) as { avatar: { url: string } }
    expect(body.avatar.url).toMatch(/^\/uploads\/avatars\/[0-9a-f-]{36}\.webp$/) // đuôi theo nội dung thật, không theo tên client
    expect(saveUploadedAvatar).toHaveBeenCalledWith("u1", body.avatar.url)
    const [target, , options] = writeFile.mock.calls[0]
    expect(String(target).split(String.fromCharCode(92)).join("/")).toMatch(/uploads\/avatars\/[0-9a-f-]{36}\.webp$/)
    expect(String(target)).not.toContain("evil")
    expect(options).toEqual({ flag: "wx" })
  })

  it("nội dung không phải ảnh JPG/PNG/WebP thì 415 dù tên và Content-Type giả", async () => {
    const res = await POST(request([file("<?php echo 1;", "a.jpg", "image/jpeg")]))
    expect(res.status).toBe(415)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("quá dung lượng thì 413; thiếu hoặc nhiều hơn một ảnh thì 400", async () => {
    const big = new Uint8Array(AVATAR_MAX_BYTES + 1)
    big.set(WEBP)
    expect((await POST(request([file(big)]))).status).toBe(413)
    expect((await POST(request([]))).status).toBe(400)
    expect((await POST(request([file(WEBP), file(WEBP)]))).status).toBe(400)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("yêu cầu từ trang khác (Origin khác host) bị chặn", async () => {
    const res = await POST(request([file(WEBP)], { origin: "https://evil.test", host: "localhost" }))
    expect(res.status).toBe(403)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it("ghi DB lỗi thì xoá file vừa ghi, không để lại file mồ côi", async () => {
    saveUploadedAvatar.mockImplementation(async () => {
      throw new AvatarError("Ảnh đại diện không hợp lệ")
    })
    const res = await POST(request([file(WEBP)]))
    expect(res.status).toBe(400)
    expect(unlink).toHaveBeenCalledTimes(1)
    expect(String(unlink.mock.calls[0][0])).toBe(String(writeFile.mock.calls[0][0]))
  })
})
