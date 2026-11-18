"use client"

import { useEffect, useState } from "react"
import { ArrowUpIcon } from "lucide-react"
import { cn } from "@/lib/cn"

const SHOW_AFTER = 600

/**
 * Nút mũi tên cuộn về đầu trang (trang chủ). Hiện khi đã cuộn quá ~600px, nằm góc phải dưới, phía trên nút trợ lý AI.
 * Cuộn mượt do `scroll-behavior` ở globals.css (tự tắt khi bật prefers-reduced-motion). Khi ẩn thì không focus được.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label="Về đầu trang"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onClick={() => window.scrollTo({ top: 0 })}
      className={cn(
        "fixed right-4 bottom-20 z-30 grid size-11 place-items-center border border-border-strong bg-card text-foreground shadow-float outline-none transition-[opacity,translate,background-color] duration-200 hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/40 sm:right-6 sm:bottom-24",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <ArrowUpIcon className="size-5" aria-hidden />
    </button>
  )
}
