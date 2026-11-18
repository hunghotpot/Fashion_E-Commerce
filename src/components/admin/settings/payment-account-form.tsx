"use client"

import { useEffect, useState } from "react"
import { updatePaymentAccountAction } from "@/app/actions/admin-settings"
import { FormField } from "@/components/admin/modal/form-field"
import { useAdminAction } from "@/components/admin/use-admin-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BANKS, formatAccountNo } from "@/lib/banks"
import { paymentAccountSchema } from "@/lib/validators/admin-payment"
import { buildVietQrPayload } from "@/lib/vietqr"

const SAMPLE_AMOUNT = 100_000
const SAMPLE_CONTENT = "FSTHU"
const bankItems = BANKS.map((b) => ({ value: b.bin, label: `${b.shortName} - ${b.name}` }))

/**
 * Admin chọn ngân hàng, nhập số tài khoản và tên chủ tài khoản; có xem trước mã QR (số tiền mẫu 100.000 đ) để quét thử bằng app
 * ngân hàng trước khi lưu. Kiểm tra dữ liệu bằng cùng schema với server; server vẫn validate lại.
 */
export function PaymentAccountForm({ initial, source }: { initial: { bankBin: string; accountNo: string; accountName: string }; source: "db" | "env" }) {
  const [bankBin, setBankBin] = useState(initial.bankBin)
  const [accountNo, setAccountNo] = useState(initial.accountNo)
  const [accountName, setAccountName] = useState(initial.accountName)
  const [qr, setQr] = useState<string | null>(null)
  const { pending, run } = useAdminAction()

  const parsed = paymentAccountSchema.safeParse({ bankBin, accountNo, accountName })

  useEffect(() => {
    if (!parsed.success) {
      setQr(null)
      return
    }
    let cancelled = false
    const { bankBin: bin, accountNo: no } = parsed.data
    import("qrcode")
      .then((m) => m.default.toDataURL(buildVietQrPayload({ bankBin: bin, accountNo: no, amount: SAMPLE_AMOUNT, content: SAMPLE_CONTENT }), { margin: 1, width: 360, errorCorrectionLevel: "M" }))
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ phụ thuộc giá trị đã chuẩn hoá
  }, [parsed.success ? `${parsed.data.bankBin}|${parsed.data.accountNo}` : ""])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(() => updatePaymentAccountAction({ bankBin, accountNo, accountName }))
  }

  const error = (field: "bankBin" | "accountNo" | "accountName") => {
    if (parsed.success) return undefined
    const issue = parsed.error.issues.find((i) => i.path[0] === field)
    // Không báo lỗi khi ô còn trống/chưa gõ gì (tránh đỏ ngay từ đầu); chỉ báo khi đã có nội dung sai.
    return issue && (field === "bankBin" ? true : (field === "accountNo" ? accountNo : accountName).trim() !== "") ? issue.message : undefined
  }

  return (
    <form onSubmit={submit} aria-labelledby="bank-title" className="space-y-5 border border-border bg-card p-6">
      <div>
        <h2 id="bank-title" className="font-sans text-base font-semibold">
          Tài khoản nhận chuyển khoản (VietQR)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {source === "db" ? "Đang dùng tài khoản bạn đã lưu." : "Đang dùng tài khoản MẪU lấy từ cấu hình máy chủ (BANK_*). Hãy lưu tài khoản thật của cửa hàng."} Mã QR ở
          trang thanh toán của khách dùng tài khoản này và được vẽ lại mỗi lần khách mở trang, nên đổi tài khoản là áp dụng ngay cả cho đơn đang chờ chuyển khoản. Nếu có khách đã chuyển vào tài khoản cũ, hãy đối chiếu sao kê của tài khoản cũ.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <FormField label="Ngân hàng" htmlFor="bank-bin" required hint={error("bankBin")}>
            <Select value={bankBin} onValueChange={(v) => setBankBin(String(v))} items={bankItems}>
              <SelectTrigger id="bank-bin">
                <SelectValue placeholder="Chọn ngân hàng" />
              </SelectTrigger>
              <SelectContent>
                {bankItems.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Số tài khoản" htmlFor="bank-account-no" required hint={error("accountNo") ?? "6 đến 19 chữ số, có thể gõ cách nhau cho dễ đọc."}>
            <Input id="bank-account-no" inputMode="numeric" autoComplete="off" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="VD: 0123456789" aria-invalid={!!error("accountNo")} />
          </FormField>
          <FormField label="Tên chủ tài khoản" htmlFor="bank-account-name" required hint={error("accountName") ?? "Nhập đúng tên đăng ký tại ngân hàng. Hệ thống tự viết HOA, bỏ dấu."}>
            <Input id="bank-account-name" autoComplete="off" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="VD: CONG TY TNHH FASHION STORE" aria-invalid={!!error("accountName")} />
          </FormField>
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="self-start text-xs font-semibold text-muted-foreground">Xem trước (quét thử)</p>
          <div className="grid aspect-square w-full max-w-[220px] place-items-center border border-border bg-white">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL sinh tại trình duyệt
              <img src={qr} alt={`Mã QR xem trước, số tiền mẫu 100.000 đồng, tới tài khoản ${formatAccountNo(accountNo.replace(/\s/g, ""))}`} className="size-full" />
            ) : (
              <p className="px-4 text-center text-xs text-muted-foreground">Nhập đủ thông tin hợp lệ để xem mã QR.</p>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">Số tiền mẫu 100.000 đ, chỉ để kiểm tra đúng tài khoản. Đừng chuyển thật.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="dark" size="md" disabled={pending || !parsed.success}>
          {pending ? "Đang lưu..." : "Lưu tài khoản"}
        </Button>
      </div>
    </form>
  )
}
