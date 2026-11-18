import { createAvatar } from "@dicebear/core"
import { glass, identicon, lorelei, notionists, pixelArt, rings, shapes, thumbs } from "@dicebear/collection"
import { AVATAR_SEED_PATTERN, isAvatarStyle, type AvatarStyle } from "@/lib/avatar"

export const runtime = "nodejs"

// Chỉ các bộ giấy phép CC0 (không cần ghi công), khớp AVATAR_STYLES ở src/lib/avatar.ts.
const STYLES: Record<AvatarStyle, Parameters<typeof createAvatar>[0]> = { shapes, rings, thumbs, glass, identicon, lorelei, notionists, pixelArt }

// Nền ảnh theo tông kem/đá của cửa hàng (cùng giá trị với --secondary, --brand-soft, --border, --border-strong trong globals.css).
const BACKGROUNDS = ["f3ede4", "fbf3e2", "e7e0d5", "d3c9ba"]

const notFound = () => new Response("Not found", { status: 404 })

/*
 * Ảnh đại diện tạo sẵn, sinh NGAY TRONG code bằng DiceBear (không gọi dịch vụ bên ngoài, không lộ dữ liệu khách).
 * Cùng style + seed luôn ra cùng ảnh nên cache dài và immutable được. style nằm trong danh sách cho phép, seed chỉ chữ và số (6–32).
 */
export async function GET(req: Request, { params }: { params: Promise<{ style: string }> }) {
  const { style } = await params
  const seed = new URL(req.url).searchParams.get("seed") ?? ""
  if (!isAvatarStyle(style) || !AVATAR_SEED_PATTERN.test(seed)) return notFound()

  const svg = createAvatar(STYLES[style], { seed, size: 128, backgroundColor: BACKGROUNDS }).toString()
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  })
}
