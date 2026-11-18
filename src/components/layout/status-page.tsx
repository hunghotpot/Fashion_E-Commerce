import type { ReactNode } from "react"

// Khung dùng chung cho trang 404 và trang lỗi: dòng nhỏ viết hoa, tiêu đề serif, mô tả, hai nút.
export function StatusPage({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <section
      aria-labelledby="status-title"
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-5 py-16"
    >
      <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-brand uppercase">
        <span aria-hidden className="h-px w-7 bg-brand" />
        {eyebrow}
      </p>
      <h1 id="status-title" className="text-4xl leading-[1.05] font-semibold text-balance md:text-5xl">
        {title}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground md:text-base">{children}</p>
      <div className="mt-2 flex flex-wrap gap-3">{actions}</div>
    </section>
  )
}
