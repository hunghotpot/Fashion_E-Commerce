import { beforeEach, describe, expect, it, vi } from "vitest"

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }))
vi.mock("node:fs/promises", () => ({ readFile, default: { readFile } }))

import { GET } from "./route"

const ID = "123e4567-e89b-42d3-a456-426614174000"
const call = (folder: string, file: string) => GET(new Request("http://localhost/uploads/x/y"), { params: Promise.resolve({ name: folder, file }) })

describe("GET /uploads/[name]/[file] (thư mục/tên)", () => {
  beforeEach(() => readFile.mockReset())

  it("phục vụ ảnh sản phẩm và ảnh đại diện từ đúng thư mục", async () => {
    readFile.mockResolvedValue(Buffer.from([1, 2, 3]))
    const a = await call("avatars", `${ID}.webp`)
    expect(a.status).toBe(200)
    expect(a.headers.get("content-type")).toBe("image/webp")
    expect(a.headers.get("cache-control")).toContain("immutable")
    expect(a.headers.get("x-content-type-options")).toBe("nosniff")
    expect(String(readFile.mock.calls[0][0]).split(String.fromCharCode(92)).join("/")).toMatch(/uploads\/avatars\//)
    const p = await call("products", `${ID}.jpg`)
    expect(p.status).toBe(200)
    expect(String(readFile.mock.calls[1][0]).split(String.fromCharCode(92)).join("/")).toMatch(/uploads\/products\//)
  })

  it("thư mục lạ hoặc tên lạ / chứa ../ bị 404 và không đọc đĩa", async () => {
    for (const [folder, name] of [
      ["secrets", `${ID}.jpg`],
      ["..", `${ID}.jpg`],
      ["avatars", "../package.json"],
      ["avatars", `${ID}.svg`],
      ["avatars", `${ID}.jpg/../x`],
      ["avatars", ""],
    ] as const) {
      expect((await call(folder, name)).status).toBe(404)
    }
    expect(readFile).not.toHaveBeenCalled()
  })

  it("file không tồn tại → 404", async () => {
    readFile.mockRejectedValueOnce(new Error("ENOENT"))
    expect((await call("avatars", `${ID}.jpg`)).status).toBe(404)
  })
})
