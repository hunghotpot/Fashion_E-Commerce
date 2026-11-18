import Image from "next/image"
import Link from "next/link"

// Khối lookbook tĩnh: lưới không đối xứng (ảnh dọc lớn + hai ảnh ngang + câu trích).
// CHỮ Ở ĐÂY LÀ NỘI DUNG MẪU, cần thay bằng thông điệp thương hiệu thật. Ảnh dùng picsum.photos tạm (không liên quan quần áo).
// Khi cần quản lý lookbook trong Admin thì đổi thành dữ liệu từ service (việc backend).
const IMG = (seed: string, w: number, h: number) => `https://picsum.photos/seed/${seed}/${w}/${h}`

function Tile({
  href,
  src,
  kicker,
  title,
  ratio,
  sizes,
}: {
  href: string
  src: string
  kicker: string
  title: string
  ratio: string
  sizes: string
}) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/40 ${ratio}`}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" />
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white">
        <span className="text-2xs font-semibold tracking-[0.18em] uppercase opacity-90">{kicker}</span>
        <span className="font-heading text-2xl leading-tight font-semibold">{title}</span>
      </span>
    </Link>
  )
}

export function Lookbook() {
  return (
    <section id="bo-suu-tap" aria-labelledby="lookbook-heading" className="reveal scroll-mt-24 space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-2xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Lookbook</p>
          <h2
            id="lookbook-heading"
            tabIndex={-1}
            className="max-w-md text-3xl leading-[1.05] font-semibold text-balance outline-none focus-visible:ring-3 focus-visible:ring-ring/40 md:text-4xl"
          >
            Phối đồ cho ngày <em className="font-medium">se lạnh</em>
          </h2>
        </div>
        <Link
          href="/products?season=thu&season=đông"
          className="inline-flex min-h-11 shrink-0 items-center text-label font-semibold underline underline-offset-4 hover:text-primary"
        >
          Xem bộ sưu tập Thu Đông →
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Tile
            href="/categories/nam"
            src={IMG("lookbook-nam", 900, 1125)}
            kicker="Nam • Thu Đông"
            title="Blazer linen và quần tây"
            ratio="aspect-4/5"
            sizes="(min-width: 1024px) 58vw, 100vw"
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <Tile
            href="/categories/nu"
            src={IMG("lookbook-nu", 900, 560)}
            kicker="Nữ"
            title="Đầm len cổ lọ"
            ratio="aspect-16/10"
            sizes="(min-width: 1024px) 42vw, 100vw"
          />
          <figure className="flex flex-1 flex-col justify-center gap-3 bg-surface p-6">
            <blockquote className="font-heading text-2xl leading-tight font-medium text-balance italic">
              “Mặc đẹp bắt đầu từ vài món chọn kỹ, không phải từ cả tủ đồ.”
            </blockquote>
            <figcaption className="text-xs text-muted-foreground">Gợi ý từ đội ngũ stylist</figcaption>
          </figure>
          <Tile
            href="/categories/phu-kien"
            src={IMG("lookbook-phukien", 900, 560)}
            kicker="Phụ kiện"
            title="Nơ cổ lụa và thắt lưng da"
            ratio="aspect-16/10"
            sizes="(min-width: 1024px) 42vw, 100vw"
          />
        </div>
      </div>
    </section>
  )
}
