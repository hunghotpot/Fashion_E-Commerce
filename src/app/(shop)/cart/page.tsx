import type { Metadata } from "next"
import { CartPageView } from "@/components/cart/cart-page-view"
import { requireUser } from "@/server/auth/session"
import { getShippingTerms } from "@/server/services/customer-spend"

export const metadata: Metadata = { title: "Giỏ hàng", robots: { index: false } }

// Giỏ hàng chỉ dành cho người đã đăng nhập: khách bị chuyển sang /login rồi quay lại /cart.
export default async function CartPage() {
  const user = await requireUser("/cart")
  const { freeShippingThreshold, flatShippingFee } = await getShippingTerms(user.id)
  return <CartPageView freeShippingThreshold={freeShippingThreshold} flatShippingFee={flatShippingFee} />
}

