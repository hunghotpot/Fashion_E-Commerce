import { ImageResponse } from "next/og"

// Favicon sinh bằng code: chữ F serif trắng trên nền ink (màu lấy từ token --ink / --background).
export const size = { width: 64, height: 64 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1c1917",
          color: "#faf7f2",
          fontSize: 44,
          fontFamily: "Georgia, serif",
          fontWeight: 700,
        }}
      >
        F
      </div>
    ),
    size,
  )
}
