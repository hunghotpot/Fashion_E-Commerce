"use client"

// Lỗi ở tầng gốc (layout hỏng): phải tự dựng <html>/<body>, nên không dùng được CSS hay font của site; chỉ giữ gọn, đọc được.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#faf7f2", color: "#1c1917" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px" }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 40, fontWeight: 600, margin: "0 0 16px" }}>
            Trang chưa tải được
          </h1>
          <p style={{ color: "#57534e", margin: "0 0 24px" }}>
            Có lỗi nghiêm trọng khi tải trang. Bạn thử tải lại; nếu vẫn lỗi, hãy quay lại sau ít phút.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ background: "#1c1917", color: "#fff", border: 0, padding: "12px 28px", fontWeight: 600, cursor: "pointer" }}
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  )
}
