"use client"

import { useOptimistic, useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { HeartIcon } from "lucide-react"
import { toast } from "sonner"
import { addToWishlistAction, removeFromWishlistAction } from "@/app/actions/wishlist"
import { cn } from "@/lib/cn"

/*
 * Yêu thích ở trang chi tiết sản phẩm. Trạng thái nằm ở hook `useWishlist` (MỘT nơi) để cùng một trạng thái điều khiển hai nút trình bày:
 * máy tính đặt cạnh hai nút mua, điện thoại đặt cạnh giá (hàng nút mua dính đáy không đủ chỗ cho nút thứ ba). Chỉ một trong hai hiện.
 * Bấm là tim đổi NGAY (cập nhật lạc quan), server trả lỗi thì tim tự quay lại và có thông báo. Khách chưa đăng nhập được chuyển sang
 * /login rồi quay lại đúng trang.
 */
export function useWishlist({ productId, initialActive, authenticated }: { productId: string; initialActive: boolean; authenticated: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [saved, setSaved] = useState(initialActive)
  const [active, setOptimistic] = useOptimistic(saved)
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (!authenticated) {
      toast.info("Vui lòng đăng nhập để lưu sản phẩm yêu thích")
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    const next = !active
    startTransition(async () => {
      setOptimistic(next)
      const res = await (next ? addToWishlistAction(productId) : removeFromWishlistAction(productId))
      if (res.ok) {
        setSaved(next)
        toast.success(res.message)
      } else {
        toast.error(res.message)
      }
    })
  }

  return { active, pending, toggle }
}

/** `aria-pressed` + nhãn nêu tên sản phẩm; trạng thái không chỉ dựa vào màu: tim đã thích có tô đặc. */
export function WishlistButton({
  state,
  productName,
  size = "lg",
  className,
}: {
  state: ReturnType<typeof useWishlist>
  productName: string
  /** lg = 52px (cạnh nút mua), md = 44px (cạnh giá trên điện thoại). */
  size?: "lg" | "md"
  className?: string
}) {
  const { active, pending, toggle } = state
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-busy={pending || undefined}
      aria-label={active ? `Bỏ ${productName} khỏi yêu thích` : `Thêm ${productName} vào yêu thích`}
      title={active ? "Bỏ khỏi yêu thích" : "Thêm vào yêu thích"}
      className={cn(
        "grid shrink-0 place-items-center border outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none",
        size === "lg" ? "size-[52px]" : "size-11",
        active ? "border-destructive bg-destructive-soft text-destructive" : "border-subtle-foreground bg-surface text-foreground hover:bg-secondary",
        className
      )}
    >
      <HeartIcon aria-hidden className={cn(size === "lg" ? "size-6" : "size-5", active && "fill-current")} />
    </button>
  )
}
