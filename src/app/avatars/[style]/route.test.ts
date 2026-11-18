import { describe, expect, it } from "vitest"
import { AVATAR_STYLE_KEYS } from "@/lib/avatar"
import { GET } from "./route"

const call = (style: string, seed?: string) =>
  GET(new Request(`http://localhost/avatars/${style}${seed === undefined ? "" : `?seed=${encodeURIComponent(seed)}`}`), { params: Promise.resolve({ style }) })

describe("GET /avatars/[style]", () => {
  it("mọi kiểu cho phép sinh ra SVG hợp lệ, cache dài, không đoán loại nội dung", async () => {
    for (const style of AVATAR_STYLE_KEYS) {
      const res = await call(style, "abc123xyz9")
      expect(res.status, style).toBe(200)
      expect(res.headers.get("content-type")).toContain("image/svg+xml")
      expect(res.headers.get("cache-control")).toContain("immutable")
      expect(res.headers.get("x-content-type-options")).toBe("nosniff")
      expect(await res.text()).toMatch(/^<svg[\s>]/)
    }
  })

  it("cùng kiểu + seed luôn ra cùng ảnh; seed khác ra ảnh khác", async () => {
    const a = await (await call("shapes", "seedAAAA11")).text()
    const b = await (await call("shapes", "seedAAAA11")).text()
    const c = await (await call("shapes", "seedBBBB22")).text()
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it("kiểu lạ hoặc seed sai dạng bị 404 (không sinh ảnh)", async () => {
    for (const [style, seed] of [
      ["avataaars", "abc123xyz9"], // bộ không nằm trong danh sách cho phép
      ["../etc", "abc123xyz9"],
      ["shapes", undefined],
      ["shapes", "ab"],
      ["shapes", "a".repeat(33)],
      ["shapes", "ab cd ef gh"],
      ["shapes", "<svg onload=alert(1)>"],
    ] as const) {
      expect((await call(style, seed)).status, `${style}|${seed}`).toBe(404)
    }
  })
})
