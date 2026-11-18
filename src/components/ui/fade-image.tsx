"use client"

import { useEffect, useRef, useState } from "react"
import Image, { type ImageProps } from "next/image"
import { cn } from "@/lib/cn"

// Lần cuộn gần nhất. Ảnh tải xong lúc trang đang cuộn (vd. cuộn mượt tới một mục, đi ngang qua nhiều ảnh lazy) thì hiện thẳng,
// không chạy hiệu ứng: hàng chục ảnh cùng mờ và phóng trong lúc cuộn làm cuộn bị giật.
let lastScrollAt = 0
if (typeof window !== "undefined") {
  window.addEventListener("scroll", () => (lastScrollAt = performance.now()), { passive: true })
}

/**
 * next/image có hiệu ứng mờ dần + phóng nhẹ khi tải xong (lớp `.img-in`). An toàn khi chưa có JS: ảnh luôn hiện sẵn, chỉ bị ẩn
 * nếu LÚC HYDRATE ảnh vẫn chưa tải xong (ảnh đã có trong cache thì không bao giờ bị ẩn). Ảnh `priority` (ứng viên LCP) không bị ẩn.
 */
export function FadeImage({ className, onLoad, onError, priority, alt, ...props }: ImageProps) {
  const ref = useRef<HTMLImageElement>(null)
  const [state, setState] = useState<"idle" | "waiting" | "done">("idle")

  // Chỉ biết ảnh đã tải xong chưa sau khi gắn vào DOM nên phải kiểm trong effect.
  useEffect(() => {
    if (!priority && ref.current && !ref.current.complete) setState("waiting")
  }, [priority])

  return (
    <Image
      {...props}
      ref={ref}
      alt={alt}
      priority={priority}
      className={cn(state === "waiting" && "opacity-0", state === "done" && "img-in", className)}
      onLoad={(e) => {
        setState((s) => (s === "waiting" ? (performance.now() - lastScrollAt < 250 ? "idle" : "done") : s))
        onLoad?.(e)
      }}
      onError={(e) => {
        setState("idle")
        onError?.(e)
      }}
    />
  )
}
