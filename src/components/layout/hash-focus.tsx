"use client"

import { useEffect } from "react"

// Khoảng cách (px) từ đỉnh màn hình tới đỉnh mục sau khi cuộn tới (= scroll-mt-24 của các mục trang chủ).
const SECTION_OFFSET = 96

/**
 * Sau khi cuộn tới một mục trên trang chủ bằng liên kết `/#id` (menu, nút hero), đưa focus vào tiêu đề mục đó để người dùng
 * bàn phím/trình đọc màn hình biết mình đang ở đâu. Chờ phần tử xuất hiện vì có thể vừa chuyển từ trang khác.
 *
 * Việc CUỘN do trình duyệt/Next lo khi đang ở trang chủ: gọi cuộn lần nữa lúc cuộn mượt đang chạy sẽ khởi động lại cuộn
 * và gây giật. Chỉ truyền `scroll: true` khi vừa chuyển từ trang khác (mục tải theo luồng nên Next chưa cuộn được); khi đó
 * chỉ cuộn nếu mục còn lệch đích.
 */
export function focusSectionHeading(hash: string, opts: { scroll?: boolean } = {}) {
  const id = decodeURIComponent(hash.replace(/^#/, ""))
  if (!id) return
  let tries = 0
  const tick = () => {
    const section = document.getElementById(id)
    const headingId = section?.getAttribute("aria-labelledby")
    if (section && !headingId) return // đích không phải mục có tiêu đề (vd. #main-content): trình duyệt tự xử lý focus
    const heading = headingId ? document.getElementById(headingId) : null
    if (section && heading) {
      if (opts.scroll && Math.abs(section.getBoundingClientRect().top - SECTION_OFFSET) > 40) {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        section.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
      }
      heading.focus({ preventScroll: true })
    } else if (++tries < 25) window.setTimeout(tick, 80)
  }
  window.setTimeout(tick, 60)
}

export function HashFocus() {
  useEffect(() => {
    // Tải thẳng URL có #id: mục có thể chưa có trong DOM lúc trình duyệt cuộn nên cho phép cuộn bù.
    if (location.hash) focusSectionHeading(location.hash, { scroll: true })

    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a[href*='#']") as HTMLAnchorElement | null
      // Liên kết trong ngăn kéo (role=dialog) tự gọi focusSectionHeading sau khi ngăn kéo đóng xong.
      if (!a || a.closest("[role=dialog]") || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
      const url = new URL(a.href, location.href)
      if (url.origin === location.origin && url.pathname === "/" && url.hash) {
        focusSectionHeading(url.hash, { scroll: location.pathname !== "/" })
      }
    }
    const onHashChange = () => location.hash && focusSectionHeading(location.hash)
    document.addEventListener("click", onClick)
    window.addEventListener("hashchange", onHashChange)
    return () => {
      document.removeEventListener("click", onClick)
      window.removeEventListener("hashchange", onHashChange)
    }
  }, [])
  return null
}
