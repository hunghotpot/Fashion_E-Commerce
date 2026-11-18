"use client"

import { useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { OrderSource } from "@/lib/order-source"
import type { AvailableVoucher, VoucherPreview, VoucherPreviewResponse, VoucherSlot } from "@/lib/voucher"
import { useVoucherStore } from "@/stores/voucher"

async function fetchPreview(code: string, paymentMethod?: string, source?: OrderSource): Promise<VoucherPreviewResponse> {
  const res = await fetch("/api/vouchers/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, paymentMethod, source }),
  })
  if (!res.ok) return { ok: false, message: "Không kiểm tra được mã giảm giá, vui lòng thử lại" }
  return (await res.json()) as VoucherPreviewResponse
}

async function fetchAvailable(paymentMethod?: string, source?: OrderSource): Promise<AvailableVoucher[]> {
  const res = await fetch("/api/vouchers/available", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentMethod, source }),
  })
  if (!res.ok) return []
  return ((await res.json()) as { vouchers: AvailableVoucher[] }).vouchers
}

const SLOTS: VoucherSlot[] = ["PRODUCT", "SHIPPING"]

/**
 * Voucher đang áp ở giỏ/thanh toán: tối đa MỘT mã giảm giá (PRODUCT) + MỘT mã vận chuyển (SHIPPING), áp cùng lúc.
 * `cartKey` (tạm tính + số lượng + nguồn hàng) đổi thì kiểm tra lại, vì điều kiện (đơn tối thiểu...) có thể đổi.
 * `previews[slot]` chỉ có khi mã hợp lệ; mã không còn hợp lệ thì `errors[slot]` có lý do và mã đó KHÔNG được gửi khi đặt đơn.
 */
export function useVoucher(opts: { paymentMethod?: string; cartKey: string; source?: OrderSource }) {
  const codes = useVoucherStore((s) => s.codes)
  const setCode = useVoucherStore((s) => s.setCode)
  const qc = useQueryClient()
  const [hydrated, setHydrated] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState<string>()

  useEffect(() => {
    void Promise.resolve(useVoucherStore.persist.rehydrate()).then(() => setHydrated(true))
  }, [])

  // Hai query cố định (mỗi nhóm một), nên số lần gọi hook không đổi giữa các lần render.
  const keyOf = (slot: VoucherSlot) => ["voucher", slot, codes[slot], opts.paymentMethod ?? null, opts.cartKey] as const
  const productQuery = useQuery({
    queryKey: keyOf("PRODUCT"),
    queryFn: () => fetchPreview(codes.PRODUCT!, opts.paymentMethod, opts.source),
    enabled: hydrated && !!codes.PRODUCT,
    staleTime: 0,
  })
  const shippingQuery = useQuery({
    queryKey: keyOf("SHIPPING"),
    queryFn: () => fetchPreview(codes.SHIPPING!, opts.paymentMethod, opts.source),
    enabled: hydrated && !!codes.SHIPPING,
    staleTime: 0,
  })
  const queries = { PRODUCT: productQuery, SHIPPING: shippingQuery }

  // Voucher khách có thể chọn dưới ô nhập. Lỗi tải thì coi như không có, không chặn việc nhập tay.
  const availableQuery = useQuery({
    queryKey: ["vouchers-available", opts.paymentMethod ?? null, opts.cartKey],
    queryFn: () => fetchAvailable(opts.paymentMethod, opts.source),
    enabled: hydrated,
    staleTime: 15_000,
  })

  const previews: Record<VoucherSlot, VoucherPreview | undefined> = { PRODUCT: undefined, SHIPPING: undefined }
  const errors: Record<VoucherSlot, string | undefined> = { PRODUCT: undefined, SHIPPING: undefined }
  for (const slot of SLOTS) {
    const data = queries[slot].data
    if (data?.ok) previews[slot] = data.preview
    else if (data) errors[slot] = data.message
  }

  /** Nhập/chọn một mã: tự xếp vào nhóm theo loại, thay mã cũ cùng nhóm (nếu có). */
  async function apply(raw: string) {
    setApplyError(undefined)
    setApplying(true)
    try {
      const res = await fetchPreview(raw, opts.paymentMethod, opts.source)
      if (res.ok) {
        const { slot, code } = res.preview
        qc.setQueryData(["voucher", slot, code, opts.paymentMethod ?? null, opts.cartKey], res)
        setCode(slot, code)
      } else {
        setApplyError(res.message)
      }
    } finally {
      setApplying(false)
    }
  }

  function clear(slot: VoucherSlot) {
    setApplyError(undefined)
    setCode(slot, null)
  }

  const discount = previews.PRODUCT?.discount ?? 0
  const shippingDiscount = previews.SHIPPING?.discount ?? 0

  return {
    codes,
    previews,
    errors,
    /** Lỗi của lần nhập/chọn vừa rồi (chưa thuộc nhóm nào vì mã chưa hợp lệ). */
    applyError,
    discount,
    shippingDiscount,
    totalDiscount: discount + shippingDiscount,
    /** Các mã đang hợp lệ, để gửi khi đặt đơn (server kiểm lại và tự tính tiền). */
    validCodes: SLOTS.flatMap((s) => (previews[s] ? [previews[s]!.code] : [])),
    available: availableQuery.data ?? [],
    checking: applying || SLOTS.some((s) => !!codes[s] && queries[s].isFetching && !queries[s].data),
    apply,
    clear,
  }
}

export type VoucherController = ReturnType<typeof useVoucher>
