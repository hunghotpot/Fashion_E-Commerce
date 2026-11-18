"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { previewTierImpactAction, updateShippingStockSettingsAction, updateTierSettingsAction } from "@/app/actions/admin-settings"
import { TierBadge } from "@/components/account/tier-badge"
import { FormField } from "@/components/admin/modal/form-field"
import { useAdminAction } from "@/components/admin/use-admin-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CUSTOMER_TIER_LABEL, CUSTOMER_TIERS, type CustomerTier } from "@/lib/customer-tier"
import type { ShopSettings } from "@/lib/shop-settings"
import { shippingStockSettingsSchema, tierSettingsSchema } from "@/lib/validators/admin-shop-settings"
import type { TierImpact } from "@/server/services/admin-shop-settings.service"

// Chỉ import KIỂU từ server (bị xoá khi build), không kéo mã server vào client.

const fmt = (n: number) => n.toLocaleString("vi-VN")
/** Chỉ giữ chữ số: ô tiền cho gõ "3.000.000" hoặc dán "3000000" đều được. */
const digits = (v: string) => v.replace(/\D/g, "")
const show = (v: string) => (v === "" ? "" : fmt(Number(v)))

function MoneyInput({ id, value, onChange, invalid, describedBy }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; describedBy?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={show(value)}
        onChange={(e) => onChange(digits(e.target.value))}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="text-right"
      />
      <span className="text-xs text-muted-foreground" aria-hidden>
        ₫
      </span>
    </div>
  )
}

function Card({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-border bg-card p-6">
      <h2 id={id} className="mb-5 font-sans text-base font-semibold">
        {title}
      </h2>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

/** Tab "Vận chuyển & Kho": phí đồng giá và ngưỡng cảnh báo tồn kho thấp. */
export function ShippingStockForm({ settings, freeShippingFrom }: { settings: ShopSettings; freeShippingFrom: number }) {
  const [fee, setFee] = useState(String(settings.flatShippingFee))
  const [low, setLow] = useState(String(settings.lowStockThreshold))
  const { pending, run } = useAdminAction()

  const parsed = shippingStockSettingsSchema.safeParse({ flatShippingFee: fee, lowStockThreshold: low })
  const err = (field: "flatShippingFee" | "lowStockThreshold") => (parsed.success ? undefined : parsed.error.issues.find((i) => i.path[0] === field)?.message)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updateShippingStockSettingsAction({ flatShippingFee: fee, lowStockThreshold: low }))
  }

  return (
    <form onSubmit={submit} aria-labelledby="shipping-title">
      <Card title="Phí vận chuyển và tồn kho" id="shipping-title">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Phí vận chuyển đồng giá" htmlFor="ship-flat" error={err("flatShippingFee")} hint="Áp cho đơn chưa đạt ngưỡng miễn phí vận chuyển.">
            <MoneyInput id="ship-flat" value={fee} onChange={setFee} invalid={!!err("flatShippingFee")} />
          </FormField>
          <FormField label="Ngưỡng cảnh báo tồn kho thấp" htmlFor="ship-low" error={err("lowStockThreshold")} hint='Biến thể có tồn từ 1 đến mức này gắn "Sắp hết" và báo cho Admin.'>
            <div className="flex items-center gap-2">
              <Input
                id="ship-low"
                inputMode="numeric"
                autoComplete="off"
                value={low}
                onChange={(e) => setLow(digits(e.target.value))}
                aria-invalid={!!err("lowStockThreshold") || undefined}
                className="text-right"
              />
              <span className="text-xs text-muted-foreground" aria-hidden>
                cái
              </span>
            </div>
          </FormField>
        </div>
        <p className="text-xs text-muted-foreground">
          Miễn phí vận chuyển từ {fmt(freeShippingFrom)} ₫ cho khách chưa có hạng; hạng cao hơn có ngưỡng thấp hơn. Chỉnh ở tab Hạng thành viên. Chưa có tích hợp đơn vị vận chuyển hay bảng phí theo vùng.
        </p>
        <div className="flex justify-end">
          <Button type="submit" variant="dark" size="md" disabled={pending || !parsed.success}>
            {pending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </Card>
    </form>
  )
}

export type WelcomeVouchers = Record<CustomerTier, { code: string }[]>

type TierDraft = Record<"silverMinSpend" | "goldMinSpend" | "diamondMinSpend" | "memberFreeShipThreshold" | "silverFreeShipThreshold" | "goldFreeShipThreshold" | "diamondFreeShipThreshold", string>

const MIN_KEY = { SILVER: "silverMinSpend", GOLD: "goldMinSpend", DIAMOND: "diamondMinSpend" } as const
const FREE_KEY = { MEMBER: "memberFreeShipThreshold", SILVER: "silverFreeShipThreshold", GOLD: "goldFreeShipThreshold", DIAMOND: "diamondFreeShipThreshold" } as const

/** Tab "Hạng thành viên": mức chi tiêu để lên hạng, ngưỡng freeship từng hạng, voucher chào mừng (chỉ đọc) và số khách bị ảnh hưởng. */
export function TierSettingsForm({ settings, welcome }: { settings: ShopSettings; welcome: WelcomeVouchers }) {
  const t = settings.tiers
  const initial: TierDraft = {
    silverMinSpend: String(t.SILVER.minSpend),
    goldMinSpend: String(t.GOLD.minSpend),
    diamondMinSpend: String(t.DIAMOND.minSpend),
    memberFreeShipThreshold: String(t.MEMBER.freeShippingThreshold),
    silverFreeShipThreshold: String(t.SILVER.freeShippingThreshold),
    goldFreeShipThreshold: String(t.GOLD.freeShippingThreshold),
    diamondFreeShipThreshold: String(t.DIAMOND.freeShippingThreshold),
  }
  const [draft, setDraft] = useState<TierDraft>(initial)
  const [impact, setImpact] = useState<TierImpact | null>(null)
  const { pending, run } = useAdminAction()
  const set = (k: keyof TierDraft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const parsed = tierSettingsSchema.safeParse(draft)
  const dirty = (Object.keys(initial) as (keyof TierDraft)[]).some((k) => initial[k] !== draft[k])
  const issueFor = (k: keyof TierDraft) => (parsed.success ? undefined : parsed.error.issues.find((i) => i.path[0] === k)?.message)
  const key = JSON.stringify(draft)

  // Xem trước số khách đổi hạng khi bản nháp hợp lệ và khác giá trị đang lưu (chờ 400ms sau lần gõ cuối).
  useEffect(() => {
    if (!parsed.success || !dirty) {
      setImpact(null)
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      previewTierImpactAction(draft)
        .then((res) => !cancelled && setImpact(res))
        .catch(() => !cancelled && setImpact(null))
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại khi nội dung bản nháp đổi
  }, [key])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updateTierSettingsAction(draft))
  }

  return (
    <form onSubmit={submit} aria-labelledby="tiers-title" className="space-y-4">
      <Card title="Hạng thành viên" id="tiers-title">
        <p className="text-xs text-muted-foreground">
          Hạng tính theo tổng chi tiêu của các đơn đã thanh toán hoặc đã giao. Mức chi tiêu tăng dần theo hạng, ngưỡng miễn phí vận chuyển giảm dần (0 = luôn miễn phí).
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {CUSTOMER_TIERS.map((tier) => {
            const minKey = tier === "MEMBER" ? null : MIN_KEY[tier]
            const freeKey = FREE_KEY[tier]
            return (
              <fieldset key={tier} className="min-w-0 space-y-4 rounded-2xl border border-border p-5">
                <legend className="px-1">
                  <TierBadge tier={tier} />
                </legend>
                <FormField
                  label="Chi tiêu từ"
                  htmlFor={`tier-min-${tier}`}
                  error={minKey ? issueFor(minKey) : undefined}
                  hint={tier === "MEMBER" ? "Mọi khách đều bắt đầu ở hạng này." : undefined}
                >
                  {minKey ? (
                    <MoneyInput id={`tier-min-${tier}`} value={draft[minKey]} onChange={set(minKey)} invalid={!!issueFor(minKey)} />
                  ) : (
                    <Input id={`tier-min-${tier}`} value="0" readOnly className="bg-secondary/60 text-right" aria-label={`Chi tiêu từ, hạng ${CUSTOMER_TIER_LABEL[tier]}, cố định 0`} />
                  )}
                </FormField>
                <FormField label="Miễn phí vận chuyển từ" htmlFor={`tier-free-${tier}`} error={issueFor(freeKey)}>
                  <MoneyInput id={`tier-free-${tier}`} value={draft[freeKey]} onChange={set(freeKey)} invalid={!!issueFor(freeKey)} />
                </FormField>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Voucher chào mừng: </span>
                  {tier === "MEMBER" ? (
                    "không có"
                  ) : welcome[tier].length === 0 ? (
                    <>
                      chưa có.{" "}
                      <Link href="/admin/vouchers" className="font-semibold underline underline-offset-4 hover:text-foreground">
                        Tạo voucher
                      </Link>
                    </>
                  ) : (
                    welcome[tier].map((v, i) => (
                      <span key={v.code}>
                        {i > 0 && ", "}
                        <Link href={`/admin/vouchers?q=${encodeURIComponent(v.code)}`} className="font-semibold underline underline-offset-4 hover:text-foreground">
                          {v.code}
                        </Link>
                      </span>
                    ))
                  )}
                </div>
              </fieldset>
            )
          })}
        </div>

        <div role="status" aria-live="polite" className="rounded-2xl bg-warning-soft px-4 py-3 text-xs text-warning">
          {impact
            ? impact.changed === 0
              ? "Mức mới không làm khách nào đổi hạng."
              : `Lưu mức mới sẽ làm ${fmt(impact.changed)} khách đổi hạng ngay: ${CUSTOMER_TIERS.map((x) => `${CUSTOMER_TIER_LABEL[x]} ${fmt(impact.current[x])} → ${fmt(impact.draft[x])}`).join(", ")}.`
            : "Đổi mức chi tiêu sẽ làm hạng của khách hiện tại đổi theo ngay. Số khách bị ảnh hưởng hiện ở đây khi bạn chỉnh."}
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="dark" size="md" disabled={pending || !parsed.success || !dirty}>
            {pending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </Card>
    </form>
  )
}
