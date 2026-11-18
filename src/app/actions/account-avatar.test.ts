import { beforeEach, describe, expect, it, vi } from "vitest"

const getCurrentUser = vi.fn()
const saveAvatarChoice = vi.fn()
const removeAvatar = vi.fn()
const revalidatePath = vi.fn()

vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))
vi.mock("@/server/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }))
vi.mock("@/server/services/avatar.service", () => {
  class AvatarError extends Error {}
  return { AvatarError, saveAvatarChoice: (...a: unknown[]) => saveAvatarChoice(...a), removeAvatar: (...a: unknown[]) => removeAvatar(...a) }
})

import { AvatarError } from "@/server/services/avatar.service"
import { removeAvatarAction, saveAvatarChoiceAction } from "./account-avatar"

const avatar = { kind: "INITIALS", color: "ink", style: null, seed: null, url: null }

describe("account-avatar actions", () => {
  beforeEach(() => {
    for (const m of [getCurrentUser, saveAvatarChoice, removeAvatar, revalidatePath]) m.mockReset()
    getCurrentUser.mockResolvedValue({ id: "u1", role: "CUSTOMER" })
    saveAvatarChoice.mockResolvedValue(avatar)
    removeAvatar.mockResolvedValue(avatar)
  })

  it("chưa đăng nhập thì từ chối và không gọi service", async () => {
    getCurrentUser.mockResolvedValue(null)
    expect(await saveAvatarChoiceAction({ kind: "INITIALS", color: "ink" })).toMatchObject({ ok: false })
    expect(await removeAvatarAction()).toMatchObject({ ok: false })
    expect(saveAvatarChoice).not.toHaveBeenCalled()
    expect(removeAvatar).not.toHaveBeenCalled()
  })

  it("chỉ đổi ảnh của chính người đang đăng nhập (userId lấy từ phiên, không từ đầu vào)", async () => {
    const res = await saveAvatarChoiceAction({ kind: "INITIALS", color: "ink", userId: "nguoi-khac" })
    expect(res).toMatchObject({ ok: true })
    expect(saveAvatarChoice.mock.calls[0][0]).toBe("u1")
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout")
  })

  it("lỗi nghiệp vụ trả message, không ném ra ngoài", async () => {
    saveAvatarChoice.mockRejectedValue(new AvatarError("Ảnh không hợp lệ"))
    expect(await saveAvatarChoiceAction({})).toEqual({ ok: false, message: "Ảnh không hợp lệ" })
    removeAvatar.mockRejectedValue(new AvatarError("Không tìm thấy tài khoản"))
    expect(await removeAvatarAction()).toEqual({ ok: false, message: "Không tìm thấy tài khoản" })
  })

  it("gỡ ảnh: trả AvatarData mới và làm mới trang", async () => {
    expect(await removeAvatarAction()).toMatchObject({ ok: true, avatar })
    expect(removeAvatar).toHaveBeenCalledWith("u1")
  })
})
