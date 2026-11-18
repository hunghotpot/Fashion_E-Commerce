import { describe, expect, it } from "vitest"
import { avatarFromRow, avatarSrc, AVATAR_COLORS, AVATAR_SEED_PATTERN, AVATAR_STYLES, generatedAvatarUrl, initialsOf, randomAvatarSeed } from "./avatar"
import { avatarChoiceSchema } from "./validators/avatar"

const UUID = "123e4567-e89b-42d3-a456-426614174000"
const row = (over: Partial<Parameters<typeof avatarFromRow>[0]> = {}) => ({
  avatarKind: "INITIALS",
  avatarColor: null,
  avatarStyle: null,
  avatarSeed: null,
  avatarUrl: null,
  ...over,
})

describe("initialsOf", () => {
  it("hai chữ (đầu họ + đầu tên) với tên nhiều từ, một chữ với tên một từ, in hoa", () => {
    expect(initialsOf("Nguyễn Minh Anh")).toBe("NA")
    expect(initialsOf("  trần   văn  b ")).toBe("TB")
    expect(initialsOf("An")).toBe("A")
    expect(initialsOf("")).toBe("?")
  })
})

describe("avatarFromRow / avatarSrc", () => {
  it("mặc định là chữ cái đầu, không có ảnh", () => {
    const a = avatarFromRow(row())
    expect(a).toMatchObject({ kind: "INITIALS", color: null })
    expect(avatarSrc(a)).toBeNull()
  })

  it("ảnh tạo sẵn: dựng đúng địa chỉ /avatars/<style>?seed=", () => {
    const a = avatarFromRow(row({ avatarKind: "GENERATED", avatarStyle: "shapes", avatarSeed: "abc123xyz" }))
    expect(avatarSrc(a)).toBe("/avatars/shapes?seed=abc123xyz")
    expect(generatedAvatarUrl("rings", "k9k9k9k9")).toBe("/avatars/rings?seed=k9k9k9k9")
  })

  it("ảnh tải lên: chỉ nhận đúng dạng server sinh", () => {
    expect(avatarSrc(avatarFromRow(row({ avatarKind: "UPLOADED", avatarUrl: `/uploads/avatars/${UUID}.webp` })))).toBe(`/uploads/avatars/${UUID}.webp`)
  })

  it("giá trị hỏng/lạ rơi về chữ cái đầu, không bao giờ hiện URL lạ", () => {
    for (const bad of [
      row({ avatarKind: "GENERATED", avatarStyle: "khong-co", avatarSeed: "abc123xyz" }),
      row({ avatarKind: "GENERATED", avatarStyle: "shapes", avatarSeed: "../x" }),
      row({ avatarKind: "GENERATED", avatarStyle: "shapes", avatarSeed: null }),
      row({ avatarKind: "UPLOADED", avatarUrl: "https://evil.test/a.jpg" }),
      row({ avatarKind: "UPLOADED", avatarUrl: `/uploads/products/${UUID}.jpg` }),
      row({ avatarKind: "UPLOADED", avatarUrl: `/uploads/avatars/../${UUID}.jpg` }),
      row({ avatarKind: "KHAC" }),
    ]) {
      const a = avatarFromRow(bad)
      expect(a.kind).toBe("INITIALS")
      expect(avatarSrc(a)).toBeNull()
    }
  })

  it("màu lạ bị bỏ, màu hợp lệ được giữ", () => {
    expect(avatarFromRow(row({ avatarColor: "brass" })).color).toBe("brass")
    expect(avatarFromRow(row({ avatarColor: "#ff0000" })).color).toBeNull()
  })
})

describe("randomAvatarSeed", () => {
  it("12 ký tự chữ và số, hợp lệ với mẫu seed, không trùng nhau", () => {
    const seeds = Array.from({ length: 50 }, randomAvatarSeed)
    for (const s of seeds) expect(s).toMatch(AVATAR_SEED_PATTERN)
    expect(new Set(seeds).size).toBe(50)
  })
})

describe("bảng màu", () => {
  it("mọi màu dùng token Tailwind, không có mã màu cứng", () => {
    for (const c of Object.values(AVATAR_COLORS)) expect(c.className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i)
  })
})

describe("avatarChoiceSchema", () => {
  it("nhận chữ cái đầu với màu trong bảng và ảnh tạo sẵn đúng kiểu/seed", () => {
    expect(avatarChoiceSchema.safeParse({ kind: "INITIALS", color: "sage" }).success).toBe(true)
    expect(avatarChoiceSchema.safeParse({ kind: "GENERATED", style: "lorelei", seed: "abc123xyz9" }).success).toBe(true)
  })

  it("từ chối màu/kiểu lạ, seed sai dạng, loại UPLOADED (đi qua route tải ảnh)", () => {
    for (const bad of [
      { kind: "INITIALS", color: "hotpink" },
      { kind: "GENERATED", style: "avataaars", seed: "abc123xyz9" }, // bộ không nằm trong danh sách CC0
      { kind: "GENERATED", style: "shapes", seed: "ab" },
      { kind: "GENERATED", style: "shapes", seed: "<script>alert(1)" },
      { kind: "UPLOADED", url: "/uploads/avatars/x.jpg" },
      {},
    ]) {
      expect(avatarChoiceSchema.safeParse(bad).success).toBe(false)
    }
  })

  it("mọi kiểu trong AVATAR_STYLES đều qua schema", () => {
    for (const style of Object.keys(AVATAR_STYLES)) expect(avatarChoiceSchema.safeParse({ kind: "GENERATED", style, seed: "abc123xyz9" }).success).toBe(true)
  })
})
