import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckoutForm } from "@/components/checkout/checkout-form"
import { summarizeCart, type CartView } from "@/lib/cart"
import { sourceFromQuery, sourceToQuery } from "@/lib/order-source"
import { getShippingFee } from "@/server/services/customer-spend"
import { requireUser } from "@/server/auth/session"
import { listAddresses } from "@/server/services/address.service"
import { getBuyNowCart, getCart } from "@/server/services/cart.service"

export const metadata: Metadata = { title: "Thanh toán", robots: { index: false } }

type SearchParams = Record<string, string | string[] | undefined>

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams
  // Nguồn hàng nằm trong URL: ?buyNow=<variantId>&qty=2 (Mua ngay), ?items=a,b (các dòng giỏ được chọn), không có = cả giỏ.
  const source = sourceFromQuery(query)
  const user = await requireUser(`/checkout${sourceToQuery(source)}`)
  const addresses = await listAddresses(user.id)

  let cart: CartView
  if (source?.buyNow) {
    const single = await getBuyNowCart(source.buyNow.variantId, source.buyNow.quantity)
    if (!single) redirect("/products")
    cart = single
  } else {
    const full = await getCart({ userId: user.id })
    cart = source?.items ? summarizeCart(full.items.filter((l) => source.items!.includes(l.variantId))) : full
  }
  if (cart.items.length === 0) redirect(source?.buyNow ? "/products" : "/cart")

  const shippingFee = await getShippingFee(user.id, cart.subtotal)

  return (
    <div className="pb-16">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="inline-block py-2 hover:text-foreground">
          Trang chủ
        </Link>
        {" / "}
        <Link href="/cart" className="inline-block py-2 hover:text-foreground">
          Giỏ hàng
        </Link>
        {" / "}
        <span className="font-semibold text-foreground">Thanh toán</span>
      </nav>
      <h1 className="mt-6 mb-10 text-4xl font-semibold">Thanh Toán Đơn Hàng</h1>

      <CheckoutForm
        source={source}
        addresses={addresses}
        items={cart.items}
        itemCount={cart.itemCount}
        subtotal={cart.subtotal}
        shippingFee={shippingFee}
        total={cart.subtotal + shippingFee}
      />
    </div>
  )
}

