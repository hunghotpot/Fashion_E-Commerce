"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const INTERVAL_MS = 8000

/**
 * Làm mới trang định kỳ trong lúc khách chờ cửa hàng xác nhận. Khi Admin xác nhận đã nhận tiền, server không còn coi đơn là
 * "chờ thanh toán" nên trang tự chuyển sang màn hình thành công, khách không phải tải lại. Chỉ chạy khi tab đang hiện;
 * quay lại tab thì làm mới ngay.
 */
export function PaymentStatusWatcher() {
  const router = useRouter()
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    const id = setInterval(refresh, INTERVAL_MS)
    document.addEventListener("visibilitychange", refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", refresh)
    }
  }, [router])
  return null
}
