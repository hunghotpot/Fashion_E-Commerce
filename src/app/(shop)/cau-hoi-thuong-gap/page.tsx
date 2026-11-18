import type { Metadata } from "next"
import Link from "next/link"
import { formatVnd } from "@/lib/format"
import { BANK_TRANSFER_WINDOW_HOURS, PAYMENT_WINDOW_MINUTES } from "@/lib/order"
import { defaultFreeShippingThreshold } from "@/lib/shop-settings"
import { getShopSettings } from "@/server/services/shop-settings.service"

export const metadata: Metadata = { title: "Câu hỏi thường gặp" }

// Chỉ trả lời điều có thật trong hệ thống (cùng nguồn với src/lib/policies.ts); mục chưa có nội dung ghi rõ "đang cập nhật".
const buildFaq = (freeShippingFrom: number, flatShippingFee: number): { q: string; a: React.ReactNode }[] => [
  {
    q: "Phí vận chuyển là bao nhiêu?",
    a: `Đơn từ ${formatVnd(freeShippingFrom)} được miễn phí vận chuyển. Đơn dưới mức này tính phí đồng giá ${formatVnd(flatShippingFee)}.`,
  },
  {
    q: "Có những cách thanh toán nào?",
    a: "Thanh toán khi nhận hàng (COD), chuyển khoản bằng mã VietQR, hoặc thẻ qua cổng VNPay.",
  },
  {
    q: "Đơn chưa thanh toán quá hạn thì sao?",
    a: `Đơn VNPay cần được thanh toán trong ${PAYMENT_WINDOW_MINUTES} phút, đơn chuyển khoản cần được cửa hàng xác nhận đã nhận tiền trong ${BANK_TRANSFER_WINDOW_HOURS} giờ. Quá hạn, đơn tự động bị huỷ và số lượng hàng được hoàn lại kho.`,
  },
  {
    q: "Tôi có thể huỷ đơn không?",
    a: 'Được, trong mục "Đơn hàng của tôi" khi đơn đang chờ xác nhận hoặc đã xác nhận.',
  },
  {
    q: "Làm sao chọn đúng size?",
    a: 'Mỗi sản phẩm có bảng size trong mục "Hướng dẫn chọn size" ở trang sản phẩm.',
  },
  {
    q: "Chính sách đổi trả thế nào?",
    a: (
      <>
        Nội dung đổi trả đang được cập nhật. Xem thêm tại{" "}
        <Link href="/chinh-sach/doi-tra" className="underline underline-offset-4 hover:text-primary">
          Chính sách đổi trả
        </Link>
        .
      </>
    ),
  },
]

export default async function FaqPage() {
  const settings = await getShopSettings()
  const FAQ = buildFaq(defaultFreeShippingThreshold(settings), settings.flatShippingFee)
  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-4">
      <header className="space-y-3">
        <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          <span aria-hidden className="h-px w-7 bg-brand" />
          Hỗ trợ
        </p>
        <h1 className="text-4xl font-semibold md:text-5xl">Câu hỏi thường gặp</h1>
      </header>
      <div>
        {FAQ.map((item, i) => (
          <details
            key={item.q}
            open={i === 0}
            className={`group/faq border-t border-border-strong py-4 ${i === FAQ.length - 1 ? "border-b" : ""}`}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-label font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40 after:text-xl after:leading-none after:content-['+'] group-open/faq:after:content-['–'] [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="mt-3 max-w-2xl text-label leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </article>
  )
}
