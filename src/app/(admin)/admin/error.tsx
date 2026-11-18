"use client"

import Link from "next/link"
import { StatusPage } from "@/components/layout/status-page"
import { Button, buttonVariants } from "@/components/ui/button"

// Lỗi bất ngờ trong khung Admin: giữ header/sidebar, chỉ thay phần nội dung.
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage
      eyebrow="Có lỗi xảy ra"
      title="Màn hình chưa tải được"
      actions={
        <>
          <Button variant="dark" size="md" className="min-w-40" onClick={reset}>
            Thử lại
          </Button>
          <Link href="/admin" className={buttonVariants({ variant: "ink-outline", size: "md", className: "min-w-40" })}>
            Về tổng quan
          </Link>
        </>
      }
    >
      Có lỗi khi đọc dữ liệu quản trị. Bạn thử tải lại; nếu vẫn lỗi, kiểm tra kết nối cơ sở dữ liệu.
    </StatusPage>
  )
}
