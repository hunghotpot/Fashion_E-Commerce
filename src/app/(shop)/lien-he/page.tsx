import type { Metadata } from "next"
import { getStoreProfile } from "@/server/services/store-profile.service"

export const metadata: Metadata = { title: "Liên hệ" }

// Thông tin do Admin nhập ở Cài đặt > Cửa hàng & Brand (StoreProfile). Trường nào chưa có thì ghi "Chưa có thông tin".
export default async function ContactPage() {
  const profile = await getStoreProfile()
  const channels = [
    { label: "Hotline", value: profile.hotline, href: profile.hotline ? `tel:${profile.hotline.replace(/[^\d+]/g, "")}` : null },
    { label: "Email", value: profile.email, href: profile.email ? `mailto:${profile.email}` : null },
    { label: "Địa chỉ cửa hàng", value: profile.address, href: null },
  ]
  const hasAny = channels.some((c) => c.value)

  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-4">
      <header className="space-y-3">
        <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          <span aria-hidden className="h-px w-7 bg-brand" />
          Hỗ trợ
        </p>
        <h1 className="text-4xl font-semibold md:text-5xl">Liên hệ</h1>
        {!hasAny && <p className="text-muted-foreground">Thông tin liên hệ đang được cửa hàng cập nhật.</p>}
      </header>
      <dl className="grid gap-4 sm:grid-cols-3">
        {channels.map((c) => (
          <div key={c.label} className="min-w-0 border border-border bg-card p-5">
            <dt className="text-2xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">{c.label}</dt>
            <dd className="mt-2 text-label [overflow-wrap:anywhere]">
              {c.value ? (
                c.href ? (
                  <a href={c.href} className="font-semibold underline underline-offset-4 hover:text-primary">
                    {c.value}
                  </a>
                ) : (
                  <span className="font-semibold">{c.value}</span>
                )
              ) : (
                <span className="text-subtle-foreground">Chưa có thông tin</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
