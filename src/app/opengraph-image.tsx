import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { SITE_NAME } from "@/lib/site"

// Ảnh chia sẻ mặc định 1200x630. Font Crimson Text SemiBold (OFL, src/assets/fonts) có đủ chữ tiếng Việt; ImageResponse không đọc được woff2 của next/font
// và không đọc được font biến thiên, nên dùng file TTF tĩnh.
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = SITE_NAME

export default async function OpengraphImage() {
  const font = await readFile(join(process.cwd(), "src/assets/fonts/CrimsonText-SemiBold.ttf"))
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#f3ede4",
          color: "#1c1917",
          fontFamily: "Crimson Text",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, color: "#854d0e", textTransform: "uppercase" }}>
          Thu Đông 2026
        </div>
        <div style={{ display: "flex", fontSize: 104, fontWeight: 600, letterSpacing: 10, marginTop: 24, textTransform: "uppercase" }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", width: 120, height: 2, background: "#a16207", marginTop: 36 }} />
        <div style={{ display: "flex", fontSize: 40, marginTop: 28, color: "#57534e" }}>Thời trang hiện đại và năng động</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Crimson Text", data: font, weight: 600, style: "normal" }] },
  )
}
