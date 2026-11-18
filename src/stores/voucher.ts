"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type { VoucherSlot } from "@/lib/voucher"

/**
 * Mã voucher khách đã nhập ở giỏ hàng, giữ qua tải lại trang (sessionStorage) để sang trang thanh toán vẫn còn.
 * Hai chỗ độc lập: một mã giảm giá (PRODUCT) và một mã vận chuyển (SHIPPING). Chỉ lưu mã, số tiền luôn do server tính.
 */
interface VoucherState {
  codes: Record<VoucherSlot, string | null>
  setCode: (slot: VoucherSlot, code: string | null) => void
}

export const useVoucherStore = create<VoucherState>()(
  persist(
    (set) => ({
      codes: { PRODUCT: null, SHIPPING: null },
      setCode: (slot, code) => set((s) => ({ codes: { ...s.codes, [slot]: code } })),
    }),
    {
      name: "voucher-codes",
      storage: createJSONStorage(() => sessionStorage),
      skipHydration: true, // nạp sau khi mount để HTML server và client khớp nhau
    }
  )
)
