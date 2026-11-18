import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { defaultFreeShippingThreshold } from "@/lib/shop-settings"
import { getPolicy, POLICIES } from "@/lib/policies"
import { getShopSettings } from "@/server/services/shop-settings.service"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return POLICIES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const policy = getPolicy((await params).slug)
  return { title: policy?.title ?? "Chính sách" }
}

export default async function PolicyPage({ params }: Props) {
  const settings = await getShopSettings()
  const policy = getPolicy((await params).slug, { freeShippingFrom: defaultFreeShippingThreshold(settings), flatShippingFee: settings.flatShippingFee })
  if (!policy) notFound()

  return (
    <article className="mx-auto max-w-3xl space-y-8 pb-4">
      <nav aria-label="Các chính sách" className="flex flex-wrap gap-2">
        {POLICIES.map((p) => (
          <Link
            key={p.slug}
            href={`/chinh-sach/${p.slug}`}
            aria-current={p.slug === policy.slug ? "page" : undefined}
            className={
              p.slug === policy.slug
                ? "rounded-none bg-ink px-4 py-1.5 text-label font-semibold text-white"
                : "rounded-none bg-secondary px-4 py-1.5 text-label font-semibold hover:bg-border"
            }
          >
            {p.title}
          </Link>
        ))}
      </nav>

      <header className="space-y-2">
        <h1 className="text-4xl font-semibold md:text-5xl">{policy.title}</h1>
        <p className="text-muted-foreground">{policy.intro}</p>
      </header>

      {policy.sections.map((s) => (
        <section key={s.heading} className="space-y-3">
          <h2 className="text-2xl font-semibold">{s.heading}</h2>
          <ul className="list-disc space-y-2 pl-5">
            {s.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}

      {policy.pending && (
        <p className="rounded-2xl bg-secondary p-4 text-label text-muted-foreground">
          Phần còn lại của chính sách này đang được cập nhật. Vui lòng quay lại sau.
        </p>
      )}
    </article>
  )
}
