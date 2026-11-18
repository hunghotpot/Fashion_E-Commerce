import { beforeEach, describe, expect, it, vi } from "vitest"

const getAdminUser = vi.fn()
const updateStoreProfile = vi.fn()
const updatePaymentAccount = vi.fn()

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/server/auth/admin", () => ({
  getAdminUser: () => getAdminUser(),
  NOT_ADMIN_MESSAGE: "Bạn không có quyền thực hiện thao tác này",
}))
vi.mock("@/server/services/admin-catalog.service", () => ({
  AdminCatalogError: class AdminCatalogError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))
vi.mock("@/server/services/admin-store-profile.service", () => ({
  updateStoreProfile: (...a: unknown[]) => updateStoreProfile(...a),
}))
vi.mock("@/server/services/admin-payment-account.service", () => ({
  updatePaymentAccount: (...a: unknown[]) => updatePaymentAccount(...a),
}))

import { AdminCatalogError } from "@/server/services/admin-catalog.service"
import { updatePaymentAccountAction, updateStoreProfileAction } from "./admin-settings"

const DENIED = { ok: false, message: "Bạn không có quyền thực hiện thao tác này" }
const INPUT = { hotline: "0901234567", email: "a@b.vn", address: "", about: "" }

beforeEach(() => {
  getAdminUser.mockReset()
  updateStoreProfile.mockReset()
  updatePaymentAccount.mockReset()
})

describe("updateStoreProfileAction", () => {
  it("khách / chưa đăng nhập bị từ chối, service không được gọi", async () => {
    getAdminUser.mockResolvedValue(null)
    expect(await updateStoreProfileAction(INPUT)).toEqual(DENIED)
    expect(updateStoreProfile).not.toHaveBeenCalled()
  })

  it("Admin hợp lệ: gọi service với { userId } và input gốc", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    updateStoreProfile.mockResolvedValue({})
    const res = await updateStoreProfileAction(INPUT)
    expect(res.ok).toBe(true)
    expect(updateStoreProfile).toHaveBeenCalledWith({ userId: "admin-1" }, INPUT)
  })

  it("input sai thì không gọi service", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    const res = await updateStoreProfileAction({ ...INPUT, email: "khong-hop-le" })
    expect(res.ok).toBe(false)
    expect(updateStoreProfile).not.toHaveBeenCalled()
  })

  it("lỗi nghiệp vụ của service được trả về dạng message", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    updateStoreProfile.mockRejectedValue(new AdminCatalogError("INVALID_INPUT", "Dữ liệu không hợp lệ"))
    expect(await updateStoreProfileAction(INPUT)).toEqual({ ok: false, message: "Dữ liệu không hợp lệ" })
  })
})

describe("updatePaymentAccountAction", () => {
  const ACCOUNT = { bankBin: "970422", accountNo: "999988882026", accountName: "Cua Hang" }

  it("khách / chưa đăng nhập bị từ chối, service không được gọi", async () => {
    getAdminUser.mockResolvedValue(null)
    expect(await updatePaymentAccountAction(ACCOUNT)).toEqual(DENIED)
    expect(updatePaymentAccount).not.toHaveBeenCalled()
  })

  it("Admin hợp lệ: gọi service với { userId } và input gốc", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    updatePaymentAccount.mockResolvedValue({})
    expect((await updatePaymentAccountAction(ACCOUNT)).ok).toBe(true)
    expect(updatePaymentAccount).toHaveBeenCalledWith({ userId: "admin-1" }, ACCOUNT)
  })

  it("input sai (ngân hàng lạ, số tài khoản sai) thì không gọi service", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    expect((await updatePaymentAccountAction({ ...ACCOUNT, bankBin: "123" })).ok).toBe(false)
    expect((await updatePaymentAccountAction({ ...ACCOUNT, accountNo: "abc" })).ok).toBe(false)
    expect(updatePaymentAccount).not.toHaveBeenCalled()
  })
})
