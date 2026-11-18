"use client"

import { useState } from "react"
import { createVoucherAction, updateVoucherAction, type CustomerOption } from "@/app/actions/admin-vouchers"
import { FormField } from "@/components/admin/modal/form-field"
import { CustomerPicker } from "@/components/admin/vouchers/customer-picker"
import { AdminModal, ModalActions } from "@/components/admin/modal/admin-modal"
import { useAdminAction } from "@/components/admin/use-admin-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/cn"
import { CUSTOMER_TIER_LABEL, type CustomerTier } from "@/lib/customer-tier"
import { VOUCHER_AUDIENCES, type VoucherAudienceValue } from "@/lib/validators/admin-voucher"
import { toVnDateInput, VOUCHER_TYPE_LABEL, VOUCHER_TYPES, type VoucherTypeValue } from "@/lib/voucher"
import type { AdminVoucherRow } from "@/server/services/admin-voucher.service"

const FORM_ID = "voucher-form"
const ALL = "all"

const TYPE_TEXT: Record<VoucherTypeValue, { amountLabel: string; hint: string; placeholder: string }> = {
  CASH: { amountLabel: "Số tiền giảm (VND)", hint: "Trừ trực tiếp vào tiền hàng", placeholder: "VD: 300000" },
  PERCENT: { amountLabel: "Phần trăm giảm (%)", hint: "Tính theo giá trị hàng được áp dụng", placeholder: "VD: 20" },
  FREESHIP: { amountLabel: "Hỗ trợ phí vận chuyển tối đa (VND)", hint: "Trừ vào phí vận chuyển", placeholder: "VD: 30000" },
}

const AUDIENCE_LABEL: Record<VoucherAudienceValue, { label: string; hint: string }> = {
  ALL: { label: "Tất cả khách", hint: "Ai cũng thấy và dùng được" },
  TIER: { label: "Theo hạng", hint: "Từ một hạng trở lên" },
  USERS: { label: "Khách cụ thể", hint: "Chọn khách, hoặc tự cấp khi lên hạng" },
}
// Hạng tối thiểu bắt đầu từ Bạc (Thành viên = mọi khách, đã có lựa chọn "Tất cả khách").
const MIN_TIER_ITEMS = (["SILVER", "GOLD", "DIAMOND"] as const).map((t) => ({ value: t, label: `Từ hạng ${CUSTOMER_TIER_LABEL[t]}` }))
const NO_WELCOME = "none"
const WELCOME_ITEMS = [
  { value: NO_WELCOME, label: "Không tự cấp" },
  ...(["MEMBER", "SILVER", "GOLD", "DIAMOND"] as const).map((t) => ({ value: t, label: t === "MEMBER" ? "Mọi khách (hạng Thành viên)" : `Khi lên hạng ${CUSTOMER_TIER_LABEL[t]}` })),
]

export interface CategoryOption {
  value: string
  label: string
}

const toNumber = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(/[.,\s]/g, "")))

/** Modal tạo/sửa voucher (sửa khi có `voucher`). Server validate lại bằng cùng schema; lỗi hiện ở toast. */
export function VoucherFormModal({
  open,
  onOpenChange,
  voucher,
  categories,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  voucher?: AdminVoucherRow
  categories: CategoryOption[]
}) {
  const { pending, run } = useAdminAction()
  const [code, setCode] = useState(voucher?.code ?? "")
  const [name, setName] = useState(voucher?.name ?? "")
  const [type, setType] = useState<VoucherTypeValue>(voucher?.type ?? "CASH")
  const [value, setValue] = useState(voucher ? String(voucher.value) : "")
  const [maxDiscount, setMaxDiscount] = useState(voucher?.maxDiscount ? String(voucher.maxDiscount) : "")
  const [minOrder, setMinOrder] = useState(voucher?.minOrder ? String(voucher.minOrder) : "")
  const [categoryId, setCategoryId] = useState(voucher?.categoryId ?? ALL)
  const [usageLimit, setUsageLimit] = useState(voucher?.usageLimit ? String(voucher.usageLimit) : "")
  const [startsAt, setStartsAt] = useState(toVnDateInput(voucher?.startsAt ?? null))
  const [expiresAt, setExpiresAt] = useState(toVnDateInput(voucher?.expiresAt ?? null))
  const [firstOrderOnly, setFirstOrderOnly] = useState(voucher?.firstOrderOnly ?? false)
  const [isActive, setIsActive] = useState(voucher?.isActive ?? true)
  const [audience, setAudience] = useState<VoucherAudienceValue>(voucher?.audience ?? "ALL")
  const [minTier, setMinTier] = useState<CustomerTier>(voucher?.minTier ?? "SILVER")
  const [welcomeTier, setWelcomeTier] = useState<string>(voucher?.welcomeTier ?? NO_WELCOME)
  const [users, setUsers] = useState<CustomerOption[]>(voucher?.assignedUsers ?? [])
  const text = TYPE_TEXT[type]
  const categoryItems = [{ value: ALL, label: "Toàn bộ sản phẩm" }, ...categories]

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const input = {
      code,
      name,
      type,
      value: toNumber(value) ?? 0,
      maxDiscount: type === "PERCENT" ? toNumber(maxDiscount) : null,
      minOrder: toNumber(minOrder) ?? 0,
      categoryId: categoryId === ALL ? null : categoryId,
      firstOrderOnly,
      usageLimit: toNumber(usageLimit),
      startsAt,
      expiresAt,
      isActive,
      audience,
      minTier: audience === "TIER" ? minTier : null,
      welcomeTier: audience === "USERS" && welcomeTier !== NO_WELCOME ? welcomeTier : null,
      userIds: audience === "USERS" ? users.map((u) => u.id) : [],
    }
    run(() => (voucher ? updateVoucherAction(voucher.id, input) : createVoucherAction(input)), { onSuccess: () => onOpenChange(false) })
  }

  return (
    <AdminModal
      open={open}
      onOpenChange={onOpenChange}
      title={voucher ? `Sửa voucher ${voucher.code}` : "Tạo Mã Giảm Giá Mới"}
      description="Mỗi khách dùng mỗi mã một lần; một đơn dùng được một mã giảm giá (tiền mặt, %) cùng một mã vận chuyển (Freeship). Hiện áp dụng khi thanh toán COD hoặc chuyển khoản."
      footer={<ModalActions formId={FORM_ID} submitLabel={voucher ? "Lưu thay đổi" : "Lưu voucher"} pending={pending} onCancel={() => onOpenChange(false)} />}
    >
      <form id={FORM_ID} onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mã Voucher (Code)" htmlFor="voucher-code" required>
            <Input id="voucher-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} placeholder="VD: THUDONG2026" className="uppercase" />
          </FormField>
          <FormField label="Tên chương trình ưu đãi" htmlFor="voucher-name" required>
            <Input id="voucher-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="VD: Ưu đãi BST Thu Đông" />
          </FormField>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-label font-semibold">Loại giảm giá</legend>
          <RadioGroup value={type} onValueChange={(v) => setType(v as VoucherTypeValue)} className="grid-cols-1 sm:grid-cols-3" aria-label="Loại giảm giá">
            {VOUCHER_TYPES.map((t) => (
              <label
                key={t}
                className={cn(
                  "flex h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 text-label font-semibold",
                  type === t ? "border-brand bg-brand-soft text-brand-strong" : "border-border bg-card text-sidebar-foreground"
                )}
              >
                <RadioGroupItem value={t} />
                {VOUCHER_TYPE_LABEL[t]}
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={text.amountLabel} htmlFor="voucher-value" required hint={text.hint}>
            <Input id="voucher-value" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder={text.placeholder} />
          </FormField>
          {type === "PERCENT" && (
            <FormField label="Giảm tối đa (VND)" htmlFor="voucher-max" hint="Bỏ trống nếu không giới hạn">
              <Input id="voucher-max" inputMode="numeric" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="VD: 500000" />
            </FormField>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Giá trị đơn hàng tối thiểu (VND)" htmlFor="voucher-min-order" hint="Tính trên phần hàng được áp dụng">
            <Input id="voucher-min-order" inputMode="numeric" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="VD: 500000" />
          </FormField>
          <FormField label="Áp dụng danh mục" htmlFor="voucher-category" hint="Gồm cả danh mục con">
            <Select value={categoryId} onValueChange={(v) => setCategoryId(String(v))} items={categoryItems}>
              <SelectTrigger id="voucher-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Tổng số lượt phát hành (hạn mức)" htmlFor="voucher-limit" hint="Bỏ trống nếu không giới hạn">
            <Input id="voucher-limit" inputMode="numeric" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="VD: 500" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Bắt đầu" htmlFor="voucher-start">
              <Input id="voucher-start" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </FormField>
            <FormField label="Hết hạn" htmlFor="voucher-expiry">
              <Input id="voucher-expiry" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </FormField>
          </div>
        </div>

        <fieldset className="space-y-3">
          <legend className="mb-2 text-label font-semibold">Đối tượng áp dụng</legend>
          <RadioGroup value={audience} onValueChange={(v) => setAudience(v as VoucherAudienceValue)} className="grid-cols-1 sm:grid-cols-3" aria-label="Đối tượng áp dụng">
            {VOUCHER_AUDIENCES.map((a) => (
              <label
                key={a}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-label font-semibold",
                  audience === a ? "border-brand bg-brand-soft text-brand-strong" : "border-border bg-card text-sidebar-foreground"
                )}
              >
                <RadioGroupItem value={a} />
                <span>
                  {AUDIENCE_LABEL[a].label}
                  <span className="block text-xs font-normal text-muted-foreground">{AUDIENCE_LABEL[a].hint}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          {audience === "TIER" && (
            <FormField label="Hạng tối thiểu" htmlFor="voucher-min-tier" required hint="Khách dưới hạng này vẫn thấy mã nhưng chưa dùng được, kèm lý do">
              <Select value={minTier} onValueChange={(v) => setMinTier(v as CustomerTier)} items={MIN_TIER_ITEMS}>
                <SelectTrigger id="voucher-min-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_TIER_ITEMS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          {audience === "USERS" && (
            <>
              <FormField label="Khách được gán" htmlFor="voucher-users" hint="Chỉ những khách này thấy và dùng được mã (tối đa 200)">
                <CustomerPicker selected={users} onChange={setUsers} />
              </FormField>
              <FormField label="Tự cấp khi khách lên hạng" htmlFor="voucher-welcome-tier" hint="Khách đạt hạng này trở lên tự nhận mã, kèm thông báo (voucher chào mừng)">
                <Select value={welcomeTier} onValueChange={(v) => setWelcomeTier(String(v))} items={WELCOME_ITEMS}>
                  <SelectTrigger id="voucher-welcome-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WELCOME_ITEMS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </>
          )}
        </fieldset>

        <div className="flex items-center justify-between rounded-xl bg-secondary px-5 py-4">
          <label htmlFor="voucher-first" className="text-label font-semibold">
            Chỉ dành cho khách mua đơn đầu tiên
          </label>
          <Switch id="voucher-first" checked={firstOrderOnly} onCheckedChange={setFirstOrderOnly} />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-secondary px-5 py-4">
          <label htmlFor="voucher-active" className="text-label font-semibold">
            Kích hoạt mã
          </label>
          <Switch id="voucher-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </form>
    </AdminModal>
  )
}

/** Nút "+ Tạo Voucher Mới" + modal. Key theo `open` để mỗi lần mở là form trống. */
export function CreateVoucherButton({ categories }: { categories: CategoryOption[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="md" onClick={() => setOpen(true)}>
        + Tạo Voucher Mới
      </Button>
      {open && <VoucherFormModal open={open} onOpenChange={setOpen} categories={categories} />}
    </>
  )
}
