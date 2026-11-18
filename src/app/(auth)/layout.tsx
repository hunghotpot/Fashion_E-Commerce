import { Logo } from "@/components/layout/logo"

// Giữ nguyên trạng thái tuỳ theo cookie nên luôn render theo request.
export const dynamic = "force-dynamic"

// Desktop: cột trái biên tập (kem + serif), cột phải là form. Mobile: logo rồi form.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside
        aria-hidden
        className="relative isolate hidden flex-col justify-between overflow-hidden bg-surface p-12 lg:flex"
      >
        <div className="absolute -top-24 -right-24 -z-10 size-96 rounded-full bg-brand-soft" />
        <div className="absolute -bottom-32 -left-16 -z-10 size-80 rounded-full border border-brand/30" />
        <div>
          <Logo />
        </div>
        <div className="max-w-md space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">Thu Đông 2026</p>
          <p className="font-heading text-5xl leading-[1.05] font-semibold text-balance">
            Phong cách bắt đầu từ những chi tiết nhỏ.
          </p>
          <p className="text-sm text-muted-foreground">
            Đăng nhập để theo dõi đơn hàng, lưu địa chỉ và mua sắm nhanh hơn.
          </p>
        </div>
      </aside>

      <main className="flex flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-md rounded-4xl border border-border bg-card p-6 shadow-card sm:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
