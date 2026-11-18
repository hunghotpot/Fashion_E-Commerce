import { beforeEach, describe, expect, it, vi } from "vitest"

const getAdminUser = vi.fn()
const svc = { createVoucher: vi.fn(), updateVoucher: vi.fn(), setVoucherActive: vi.fn(), deleteVoucher: vi.fn() }
const listCustomers = vi.fn()

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
vi.mock("@/server/services/admin-customer.service", () => ({ listCustomers: (...a: unknown[]) => listCustomers(...a) }))
vi.mock("@/server/services/admin-voucher.service", () => ({
  createVoucher: (...a: unknown[]) => svc.createVoucher(...a),
  updateVoucher: (...a: unknown[]) => svc.updateVoucher(...a),
  setVoucherActive: (...a: unknown[]) => svc.setVoucherActive(...a),
  deleteVoucher: (...a: unknown[]) => svc.deleteVoucher(...a),
}))

import { AdminCatalogError } from "@/server/services/admin-catalog.service"
import { createVoucherAction, deleteVoucherAction, searchCustomersForVoucherAction, setVoucherActiveAction, updateVoucherAction } from "./admin-vouchers"

const DENIED = { ok: false, message: "Bạn không có quyền thực hiện thao tác này" }
const INPUT = {
  code: "THU2026",
  name: "Thu đông",
  type: "CASH",
  value: 50_000,
  maxDiscount: null,
  minOrder: 0,
  categoryId: null,
  firstOrderOnly: false,
  usageLimit: null,
  startsAt: "",
  expiresAt: "",
  isActive: true,
}
const ID = "cknvoucher0000000000000000"

beforeEach(() => {
  getAdminUser.mockReset()
  for (const f of Object.values(svc)) f.mockReset()
})

describe("Server Action voucher Admin", () => {
  it("khách / chưa đăng nhập bị từ chối ở mọi action, service không được gọi", async () => {
    getAdminUser.mockResolvedValue(null)
    expect(await createVoucherAction(INPUT)).toEqual(DENIED)
    expect(await updateVoucherAction(ID, INPUT)).toEqual(DENIED)
    expect(await setVoucherActiveAction(ID, false)).toEqual(DENIED)
    expect(await deleteVoucherAction(ID)).toEqual(DENIED)
    for (const f of Object.values(svc)) expect(f).not.toHaveBeenCalled()
  })

  it("Admin hợp lệ: tạo gọi service với { userId } và input gốc", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    svc.createVoucher.mockResolvedValue({})
    expect((await createVoucherAction(INPUT)).ok).toBe(true)
    expect(svc.createVoucher).toHaveBeenCalledWith({ userId: "admin-1" }, INPUT)
  })

  it("input sai (% quá 100) hoặc isActive không phải boolean thì không gọi service", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    expect((await createVoucherAction({ ...INPUT, type: "PERCENT", value: 150 })).ok).toBe(false)
    expect((await setVoucherActiveAction(ID, "yes")).ok).toBe(false)
    expect(svc.createVoucher).not.toHaveBeenCalled()
    expect(svc.setVoucherActive).not.toHaveBeenCalled()
  })

  it("lỗi nghiệp vụ (mã đã dùng không xoá được) trả về dạng message", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    svc.deleteVoucher.mockImplementation(async () => {
      throw new AdminCatalogError("VOUCHER_IN_USE", "Mã đã có đơn dùng")
    })
    expect(await deleteVoucherAction(ID)).toEqual({ ok: false, message: "Mã đã có đơn dùng" })
  })
})

describe("searchCustomersForVoucherAction", () => {
  beforeEach(() => {
    getAdminUser.mockReset()
    listCustomers.mockReset()
  })

  it("không phải Admin thì trả rỗng và không truy vấn", async () => {
    getAdminUser.mockResolvedValue(null)
    expect(await searchCustomersForVoucherAction("nguyen")).toEqual([])
    expect(listCustomers).not.toHaveBeenCalled()
  })

  it("từ khoá dưới 2 ký tự hoặc không phải chuỗi thì trả rỗng", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1" })
    expect(await searchCustomersForVoucherAction("a")).toEqual([])
    expect(await searchCustomersForVoucherAction(42)).toEqual([])
    expect(listCustomers).not.toHaveBeenCalled()
  })

  it("Admin: tìm tối đa 8 khách và chỉ trả id, tên, email (không lộ SĐT, trạng thái)", async () => {
    getAdminUser.mockResolvedValue({ id: "admin-1" })
    listCustomers.mockResolvedValue({
      items: [{ id: "u1", name: "Nguyễn An", email: "an@x.vn", phone: "0901", status: "ACTIVE", tier: "GOLD" }],
    })
    expect(await searchCustomersForVoucherAction("  nguyen ")).toEqual([{ id: "u1", name: "Nguyễn An", email: "an@x.vn" }])
    expect(listCustomers).toHaveBeenCalledWith({ q: "nguyen", pageSize: 8 })
  })
})
