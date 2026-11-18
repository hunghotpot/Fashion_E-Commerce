import Link from "next/link"
import { ConstructionIcon } from "lucide-react"

/** Trang chưa dựng: khung Admin đã có sẵn menu/quyền, nội dung từng màn hình làm ở bước sau. */
export function AdminComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border-strong px-6 py-16 text-center">
      <ConstructionIcon className="size-10 text-subtle-foreground" aria-hidden />
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="max-w-md text-label text-muted-foreground">{note ?? "Màn hình này đang được xây dựng."}</p>
      <Link href="/admin" className="text-label font-semibold underline underline-offset-4">
        Về Tổng quan
      </Link>
    </section>
  )
}
