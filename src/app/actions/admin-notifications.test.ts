import { beforeEach, describe, expect, it, vi } from "vitest"

const getAdminUser = vi.fn()
const markSeen = vi.fn()
const markRead = vi.fn()

vi.mock("@/server/auth/admin", () => ({
  getAdminUser: () => getAdminUser(),
  NOT_ADMIN_MESSAGE: "Bạn không có quyền thực hiện thao tác này",
}))
vi.mock("@/server/services/admin-notification.service", () => ({
  markAdminNotificationsSeen: (...a: unknown[]) => markSeen(...a),
  markAdminNotificationRead: (...a: unknown[]) => markRead(...a),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { markAdminNotificationReadAction, markAdminNotificationsSeenAction } from "./admin-notifications"

beforeEach(() => {
  getAdminUser.mockReset()
  markSeen.mockReset()
  markRead.mockReset()
})

describe("markAdminNotificationsSeenAction", () => {
  it("khách / chưa đăng nhập bị từ chối, không đổi dữ liệu", async () => {
    getAdminUser.mockResolvedValue(null)
    expect(await markAdminNotificationsSeenAction()).toEqual({ ok: false, message: "Bạn không có quyền thực hiện thao tác này" })
    expect(markSeen).not.toHaveBeenCalled()
  })

  it("Admin hợp lệ: chỉ đánh dấu cho chính mình", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    expect((await markAdminNotificationsSeenAction()).ok).toBe(true)
    expect(markSeen).toHaveBeenCalledWith("admin-1")
  })
})

describe("markAdminNotificationReadAction", () => {
  it("khách / chưa đăng nhập bị từ chối, không đổi dữ liệu", async () => {
    getAdminUser.mockResolvedValue(null)
    expect(await markAdminNotificationReadAction("n1")).toEqual({ ok: false, message: "Bạn không có quyền thực hiện thao tác này" })
    expect(markRead).not.toHaveBeenCalled()
  })

  it("mã rỗng hoặc quá dài bị từ chối", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    expect((await markAdminNotificationReadAction("")).ok).toBe(false)
    expect((await markAdminNotificationReadAction("x".repeat(65))).ok).toBe(false)
    expect(markRead).not.toHaveBeenCalled()
  })

  it("Admin hợp lệ: đánh dấu đúng thông báo cho chính mình", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    expect((await markAdminNotificationReadAction("n1")).ok).toBe(true)
    expect(markRead).toHaveBeenCalledWith("admin-1", "n1")
  })
})
