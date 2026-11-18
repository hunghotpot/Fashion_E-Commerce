"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { focusSectionHeading } from "@/components/layout/hash-focus"
import { NAV_LINKS } from "@/components/layout/nav-links"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useNotifications } from "@/hooks/use-notifications"

const ROW = "flex min-h-12 items-center justify-between border-b border-border px-5 text-base font-semibold outline-none hover:bg-secondary focus-visible:bg-secondary"

/** Chấm báo có thông báo chưa đọc trên nút ba gạch (chỉ màn dưới sm, nơi chuông đã chuyển vào ngăn kéo). */
function UnreadDot() {
  const { data } = useNotifications()
  if (!data || data.unread <= 0) return null
  return <span aria-hidden className="absolute top-1 right-1 size-2.5 rounded-full bg-primary ring-2 ring-background sm:hidden" />
}

function NotificationsRow({ onNavigate }: { onNavigate: (href: string, e: React.MouseEvent) => void }) {
  const { data } = useNotifications()
  const unread = data?.unread ?? 0
  return (
    <Link href="/account/notifications" onClick={(e) => onNavigate("/account/notifications", e)} className={`${ROW} sm:hidden`}>
      Thông báo
      {unread > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-2xs leading-none font-semibold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
          <span className="sr-only"> chưa đọc</span>
        </span>
      )}
    </Link>
  )
}

/**
 * Nút ba gạch + ngăn kéo menu (dưới xl). Bấm một mục thì đóng ngăn kéo rồi mới chuyển trang/cuộn, để khoá cuộn của ngăn kéo
 * không chặn việc cuộn tới mục trên trang chủ. Màn dưới sm: chuông thông báo nằm trong ngăn kéo (header không đủ chỗ).
 */
export function MobileMenu({ authenticated }: { authenticated: boolean }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pending = useRef<string | null>(null)

  function onNavigate(href: string, e: React.MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    pending.current = href
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        aria-label="Mở menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`${buttonVariants({ variant: "ghost", size: "icon-sm" })} relative -ml-2 xl:hidden`}
      >
        <MenuIcon />
        {authenticated && <UnreadDot />}
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen && pending.current) {
            const href = pending.current
            pending.current = null
            router.push(href)
            const hash = href.split("#")[1]
            // Đang ở trang chủ thì Next tự cuộn (cuộn thêm sẽ giật); từ trang khác sang thì cần cuộn bù.
            if (hash) focusSectionHeading(hash, { scroll: window.location.pathname !== "/" })
          }
        }}
      >
        <SheetContent side="left" className="gap-0 sm:max-w-xs">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">Các mục chính của cửa hàng</SheetDescription>
          </SheetHeader>
          <nav aria-label="Menu chính" className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={(e) => onNavigate(l.href, e)} className={ROW}>
                {l.label}
              </Link>
            ))}
            {authenticated && <NotificationsRow onNavigate={onNavigate} />}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
