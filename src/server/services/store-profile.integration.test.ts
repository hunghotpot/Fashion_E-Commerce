import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { db } from "@/server/db"
import { updateStoreProfile } from "./admin-store-profile.service"
import { AdminCatalogError } from "./admin-catalog.service"
import { EMPTY_STORE_PROFILE, getStoreProfile, STORE_PROFILE_ID } from "./store-profile.service"

/*
 * Test tích hợp trên DB test riêng (fashion_test): dòng cấu hình duy nhất (id "default") được xoá trước mỗi ca và sau khi xong.
 */
const ADMIN = { userId: "admin-test" }

beforeEach(async () => {
  await db.storeProfile.deleteMany({ where: { id: STORE_PROFILE_ID } })
})
afterAll(async () => {
  await db.storeProfile.deleteMany({ where: { id: STORE_PROFILE_ID } })
  await db.$disconnect()
})

describe("getStoreProfile", () => {
  it("chưa cấu hình: mọi trường là null", async () => {
    expect(await getStoreProfile()).toEqual(EMPTY_STORE_PROFILE)
  })
})

describe("updateStoreProfile", () => {
  it("lưu và đọc lại; cắt khoảng trắng, chuỗi rỗng thành null", async () => {
    const saved = await updateStoreProfile(ADMIN, {
      hotline: "  0901 234 567 ",
      email: "cskh@cuahang.vn",
      address: "",
      about: "Đoạn một.\n\nĐoạn hai.",
    })
    expect(saved).toEqual({ hotline: "0901 234 567", email: "cskh@cuahang.vn", address: null, about: "Đoạn một.\n\nĐoạn hai." })
    expect(await getStoreProfile()).toEqual(saved)
  })

  it("lưu lần hai ghi đè (một dòng duy nhất)", async () => {
    await updateStoreProfile(ADMIN, { hotline: "0901234567", email: "", address: "A", about: "" })
    await updateStoreProfile(ADMIN, { hotline: "", email: "b@c.vn", address: "", about: "" })
    expect(await getStoreProfile()).toEqual({ hotline: null, email: "b@c.vn", address: null, about: null })
    expect(await db.storeProfile.count()).toBe(1)
  })

  it.each([
    [{ hotline: "abc", email: "", address: "", about: "" }, "Hotline"],
    [{ hotline: "", email: "khong-phai-email", address: "", about: "" }, "Email"],
    [{ hotline: "", email: "", address: "x".repeat(201), about: "" }, "Địa chỉ"],
  ])("input sai bị từ chối và không ghi gì: %j", async (input, field) => {
    await expect(updateStoreProfile(ADMIN, input)).rejects.toMatchObject({ code: "INVALID_INPUT", message: expect.stringContaining(field) })
    await expect(updateStoreProfile(ADMIN, input)).rejects.toBeInstanceOf(AdminCatalogError)
    expect(await db.storeProfile.count()).toBe(0)
  })
})
