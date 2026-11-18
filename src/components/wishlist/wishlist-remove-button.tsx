"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { removeFromWishlistAction } from "@/app/actions/wishlist"

/** Nút "Bỏ yêu thích" dưới mỗi thẻ ở trang Yêu thích. Bấm xong tải lại danh sách; lỗi thì có thông báo và giữ nguyên thẻ. */
export function WishlistRemoveButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      const res = await removeFromWishlistAction(productId)
      if (res.ok) {
        toast.success(res.message)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Bỏ ${productName} khỏi yêu thích`}
      className="inline-flex min-h-11 items-center rounded text-label font-semibold text-muted-foreground underline underline-offset-4 outline-none hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50"
    >
      {pending ? "Đang bỏ..." : "Bỏ yêu thích"}
    </button>
  )
}
