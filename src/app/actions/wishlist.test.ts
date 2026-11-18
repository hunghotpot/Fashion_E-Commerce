import { beforeEach, describe, expect, it, vi } from "vitest"

const getCurrentUser = vi.fn()
const addToWishlist = vi.fn()
const removeFromWishlist = vi.fn()
const revalidatePath = vi.fn()

vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))
vi.mock("@/server/auth/session", () => ({ getCurrentUser: () => getCurrentUser() }))
vi.mock("@/server/services/wishlist.service", () => {
  class WishlistError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  }
  return {
    WishlistError,
    addToWishlist: (...a: unknown[]) => addToWishlist(...a),
    removeFromWishlist: (...a: unknown[]) => removeFromWishlist(...a),
  }
})

import { WishlistError } from "@/server/services/wishlist.service"
import { addToWishlistAction, removeFromWishlistAction } from "./wishlist"

describe("wishlist actions", () => {
  beforeEach(() => {
    for (const m of [getCurrentUser, addToWishlist, removeFromWishlist, revalidatePath]) m.mockReset()
    getCurrentUser.mockResolvedValue({ id: "u1", role: "CUSTOMER" })
    addToWishlist.mockResolvedValue(undefined)
    removeFromWishlist.mockResolvedValue(undefined)
  })

  it("chưa đăng nhập thì từ chối và không gọi service", async () => {
    getCurrentUser.mockResolvedValue(null)
    expect(await addToWishlistAction("p1")).toMatchObject({ ok: false })
    expect(await removeFromWishlistAction("p1")).toMatchObject({ ok: false })
    expect(addToWishlist).not.toHaveBeenCalled()
    expect(removeFromWishlist).not.toHaveBeenCalled()
  })

  it("userId lấy từ phiên; ghi xong thì làm mới trang", async () => {
    expect(await addToWishlistAction("p1")).toMatchObject({ ok: true })
    expect(addToWishlist).toHaveBeenCalledWith("u1", "p1")
    expect(await removeFromWishlistAction("p1")).toMatchObject({ ok: true })
    expect(removeFromWishlist).toHaveBeenCalledWith("u1", "p1")
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
  })

  it("lỗi nghiệp vụ trả message, không ném ra ngoài và không làm mới trang", async () => {
    addToWishlist.mockRejectedValue(new WishlistError("PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm"))
    expect(await addToWishlistAction("x")).toEqual({ ok: false, message: "Không tìm thấy sản phẩm" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("lỗi không lường trước vẫn được ném ra", async () => {
    removeFromWishlist.mockRejectedValue(new Error("db down"))
    await expect(removeFromWishlistAction("p1")).rejects.toThrow("db down")
  })
})
