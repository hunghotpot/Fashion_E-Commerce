"use client"

import { useState, useTransition } from "react"
import { CheckIcon, LoaderCircleIcon } from "lucide-react"
import { toast } from "sonner"
import { reportBankTransferAction } from "@/app/actions/payment"
import { Button } from "@/components/ui/button"

/**
 * "Tôi đã chuyển khoản": báo cho cửa hàng để đối soát sớm. KHÔNG đổi trạng thái thanh toán (chỉ cửa hàng xác nhận đã nhận tiền).
 * Trạng thái rõ ràng: chưa báo → đang gửi → đã báo (nút khoá, có giờ báo). `reportedAt` do server truyền vào nên tải lại trang vẫn đúng.
 */
export function ReportTransferButton({ orderId, reportedAt }: { orderId: string; reportedAt: string | null }) {
  const [reported, setReported] = useState<string | null>(reportedAt)
  const [pending, start] = useTransition()

  if (reported) {
    return (
      <div role="status" className="flex items-start gap-3 border border-success/40 bg-success-soft px-4 py-3 text-label">
        <CheckIcon className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <p className="text-sidebar-foreground">
          <b className="text-success">Đã báo cho cửa hàng</b> lúc{" "}
          {new Date(reported).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}. Cửa hàng sẽ
          xác nhận sau khi đối chiếu tiền về, trang này tự cập nhật.
        </p>
      </div>
    )
  }

  return (
    <Button
      type="button"
      size="xl"
      disabled={pending}
      className="w-full"
      onClick={() =>
        start(async () => {
          const res = await reportBankTransferAction(orderId)
          if (res.ok) setReported(new Date().toISOString())
          else toast.error(res.message ?? "Không gửi được, vui lòng thử lại")
        })
      }
    >
      {pending ? <LoaderCircleIcon className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
      {pending ? "Đang báo cho cửa hàng..." : "Tôi đã chuyển khoản"}
    </Button>
  )
}
