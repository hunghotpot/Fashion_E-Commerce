import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { formatVnd } from "@/lib/format"

// Điểm nhấn dưới hero: lấy từ chính sách có thật (ngưỡng freeship của cửa hàng, COD), không phải số liệu bịa.
const highlights = (freeShippingFrom: number) => [
  { value: "COD", label: "Thanh toán khi nhận hàng" },
  { value: formatVnd(freeShippingFrom), label: "Miễn phí vận chuyển từ" },
  { value: "Toàn quốc", label: "Giao hàng" },
]

// Hero biên tập: nền kem ấm, tiêu đề serif lớn có một từ in nghiêng, nút đen + nút viền, hàng điểm nhấn.
// Bên phải chỉ là hình trang trí bằng CSS (aria-hidden) cho tới khi có ảnh người mẫu thật.
export function Hero({ freeShippingFrom }: { freeShippingFrom: number }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate grid overflow-hidden rounded-3xl bg-surface lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col items-start justify-center gap-5 px-6 py-12 md:px-16 md:py-16">
        <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-brand-strong uppercase">
          <span aria-hidden className="h-px w-7 bg-brand" />
          Bộ sưu tập Thu Đông 2026
        </p>
        <h1
          id="hero-heading"
          className="max-w-xl text-4xl leading-[1.05] font-semibold text-balance md:text-6xl"
        >
          Thu Đông 2026, <em className="font-medium">tinh tế</em> từng đường may
        </h1>
        <p className="max-w-md text-sm text-muted-foreground md:text-base">
          Khám phá phong cách thời trang tinh tế, từ đồ mặc hằng ngày đến phụ kiện hoàn thiện outfit.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href="#danh-muc" className={buttonVariants({ variant: "dark", size: "md", className: "min-w-40" })}>
            Mua theo danh mục
          </Link>
          <Link
            href="#bo-suu-tap"
            className={buttonVariants({ variant: "ink-outline", size: "md", className: "min-w-40" })}
          >
            Xem bộ sưu tập
          </Link>
        </div>
        <dl className="mt-4 flex w-full flex-wrap gap-x-6 gap-y-3 border-t border-border-strong pt-5">
          {highlights(freeShippingFrom).map((h) => (
            <div key={h.label} className="flex flex-col-reverse gap-1">
              <dt className="text-2xs tracking-[0.08em] text-muted-foreground uppercase">{h.label}</dt>
              <dd className="font-heading text-xl leading-none font-semibold">{h.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div aria-hidden className="relative -z-10 hidden min-h-80 overflow-hidden lg:block">
        <div className="absolute -top-24 -right-20 size-[28rem] rounded-full bg-brand-soft" />
        <div className="absolute -right-10 -bottom-32 size-80 rounded-full border border-brand/30" />
        <span className="absolute right-12 bottom-8 font-heading text-[8rem] leading-none font-semibold text-brand/15 select-none">
          2026
        </span>
      </div>
    </section>
  )
}
