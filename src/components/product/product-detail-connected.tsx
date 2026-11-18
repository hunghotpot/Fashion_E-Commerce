"use client"

import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { ProductDetailMain } from "@/components/product/product-detail-main"
import { useAddToCart } from "@/hooks/use-cart"
import { sourceToQuery } from "@/lib/order-source"
import type { ProductDetail } from "@/types/catalog"

// Nối ProductDetailMain với giỏ hàng. "Mua ngay" = sang thẳng trang thanh toán chỉ với sản phẩm này, KHÔNG thêm vào giỏ và không đụng giỏ.
// Khách chưa đăng nhập: chuyển sang /login rồi quay lại đúng trang sản phẩm.
export function ProductDetailConnected({
  product,
  careTips,
  authenticated,
}: {
  product: ProductDetail
  careTips: string[]
  authenticated: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { mutate } = useAddToCart()

  function add(item: { variantId: string; quantity: number }, onSuccess?: () => void) {
    if (!authenticated) {
      toast.info("Vui lòng đăng nhập để thêm vào giỏ hàng")
      router.push(`/login?next=${encodeURIComponent(pathname)}`)
      return
    }
    const v = product.variants.find((x) => x.id === item.variantId)
    if (!v) return
    mutate(
      {
        ...item,
        preview: {
          variantId: v.id,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          sku: v.sku,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          image: product.images[0] ?? null,
          unitPrice: v.price,
          stock: v.stock,
        },
      },
      { onSuccess }
    )
  }

  return (
    <ProductDetailMain
      product={product}
      careTips={careTips}
      onAddToCart={(item) => add(item)}
      onBuyNow={(item) => {
        if (!authenticated) {
          toast.info("Vui lòng đăng nhập để mua hàng")
          router.push(`/login?next=${encodeURIComponent(pathname)}`)
          return
        }
        router.push(`/checkout${sourceToQuery({ buyNow: item })}`)
      }}
    />
  )
}

