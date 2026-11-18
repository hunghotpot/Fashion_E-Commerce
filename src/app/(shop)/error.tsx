"use client"

import Link from "next/link"
import { StatusPage } from "@/components/layout/status-page"
import { Button, buttonVariants } from "@/components/ui/button"

// Lỗi bất ngờ trong khung cửa hàng. Không hiện nội dung lỗi cho khách; chỉ cho thử lại hoặc về trang chủ.
export default function ShopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage
      eyebrow="Có lỗi xảy ra"
      title="Trang chưa tải được"
      actions={
        <>
          <Button variant="dark" size="md" className="min-w-40" onClick={reset}>
            Thử lại
          </Button>
          <Link href="/" className={buttonVariants({ variant: "ink-outline", size: "md", className: "min-w-40" })}>
            Về trang chủ
          </Link>
        </>
      }
    >
      Có lỗi khi tải nội dung. Bạn thử tải lại trang; nếu vẫn lỗi, hãy quay lại sau ít phút.
    </StatusPage>
  )
}
