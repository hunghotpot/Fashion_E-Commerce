// Liên kết "Bỏ qua tới nội dung chính": ẩn cho đến khi nhận focus bàn phím, để khỏi phải Tab qua cả header. Đích là <main id="main-content">.
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:px-4 focus:py-3 focus:text-label focus:font-semibold focus:text-white focus:outline-none focus:ring-3 focus:ring-ring/60"
    >
      Bỏ qua tới nội dung chính
    </a>
  )
}
