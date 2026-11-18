import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import QRCode from "qrcode"
import { CheckIcon, DownloadIcon } from "lucide-react"
import { cn } from "@/lib/cn"
import { CopyRow } from "@/components/checkout/copy-row"
import { PaymentCountdown } from "@/components/checkout/payment-countdown"
import { PaymentStatusWatcher } from "@/components/checkout/payment-status-watcher"
import { ReportTransferButton } from "@/components/checkout/report-transfer-button"
import { buttonVariants } from "@/components/ui/button"
import { formatAccountNo } from "@/lib/banks"
import { formatDateTime, formatVnd } from "@/lib/format"
import { PAYMENT_WINDOW_MINUTES, paymentDeadline, transferContent } from "@/lib/order"
import { buildVietQrPayload } from "@/lib/vietqr"
import { requireUser } from "@/server/auth/session"
import { VNPAY_RESPONSE_MESSAGE } from "@/server/payment/vnpay"
import { getOrder } from "@/server/services/order.service"
import { getPaymentAccount } from "@/server/services/payment-account.service"
import { expireUnpaidOrders, getTransferReportedAt } from "@/server/services/payment.service"

export const metadata: Metadata = { title: "Thanh toán đơn hàng", robots: { index: false } }

const STEPS = ["Đặt đơn", "Chuyển khoản", "Cửa hàng xác nhận"] as const

export default async function OrderPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ result?: string; code?: string }>
}) {
  const { id } = await params
  const user = await requireUser(`/orders/${id}/payment`)
  await expireUnpaidOrders() // dọn đơn quá hạn (VNPay 15 phút, chuyển khoản 24 giờ) trước khi hiển thị, phòng khi cron chưa chạy
  const order = await getOrder(user.id, id)
  if (!order) notFound()

  if (order.paymentMethod === "VNPAY") {
    // Đã thanh toán xong → trang thành công. Còn lại: báo kết quả / cho thanh toán lại.
    if (order.paymentStatus === "PAID") redirect(`/orders/${id}/success`)
    return <VnpayStatus order={order} search={await searchParams} />
  }
  // Chỉ đơn chuyển khoản mới có mã QR. Admin đã xác nhận tiền (hoặc đơn không phải chuyển khoản) → trang thành công.
  if (order.paymentMethod !== "BANK_TRANSFER" || order.paymentStatus !== "PENDING") redirect(`/orders/${id}/success`)
  if (order.status === "CANCELLED") return <TransferExpired code={order.code} total={order.total} />

  const account = await getPaymentAccount()
  const content = transferContent(order.code)
  const deadline = paymentDeadline("BANK_TRANSFER", order.createdAt)!
  const reportedAt = await getTransferReportedAt(user.id, order.id)
  const qr = await QRCode.toDataURL(buildVietQrPayload({ bankBin: account.bin, accountNo: account.accountNo, amount: order.total, content }), {
    margin: 1,
    width: 420,
    errorCorrectionLevel: "M",
  })

  return (
    <div className="pb-16">
      <PaymentStatusWatcher />
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/" className="inline-block py-2 hover:text-foreground">
          Trang chủ
        </Link>
        {" / "}
        <Link href="/cart" className="inline-block py-2 hover:text-foreground">
          Giỏ hàng
        </Link>
        {" / Thanh toán / "}
        <span className="font-semibold text-foreground">Chuyển khoản</span>
      </nav>

      <div className="mx-auto mt-8 max-w-[960px] space-y-6">
        {/* Tiêu đề + tiến trình + hạn */}
        <section aria-labelledby="pay-title" className="border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Đơn #{order.code}</p>
              <h1 id="pay-title" className="mt-1 text-3xl font-semibold sm:text-4xl">
                Hoàn tất chuyển khoản
              </h1>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Số tiền cần chuyển</p>
              <p className="text-3xl font-semibold text-primary tabular-nums">{formatVnd(order.total)}</p>
            </div>
          </div>

          <ol className="mt-6 grid grid-cols-3 gap-2 sm:gap-4" aria-label="Các bước thanh toán">
            {STEPS.map((label, i) => {
              const done = i === 0
              const current = i === 1
              return (
                <li key={label} aria-current={current ? "step" : undefined} className="min-w-0">
                  <div className={cn("h-1", done ? "bg-success" : current ? "bg-ink" : "bg-border")} />
                  <p className={cn("mt-2 flex items-center gap-1.5 text-xs font-semibold sm:text-label", current ? "text-foreground" : "text-muted-foreground")}>
                    {done ? <CheckIcon className="size-4 shrink-0 text-success" aria-hidden /> : <span aria-hidden>{i + 1}.</span>}
                    <span className="min-w-0 break-words">{label}</span>
                  </p>
                </li>
              )
            })}
          </ol>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <PaymentCountdown deadline={deadline.toISOString()} />
            <p className="text-xs text-muted-foreground">Hạn chuyển khoản: {formatDateTime(deadline)}. Quá hạn đơn tự huỷ và hàng được hoàn lại kho.</p>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          {/* Mã QR */}
          <section aria-label="Mã QR chuyển khoản" className="flex flex-col items-center gap-4 border border-border bg-card p-5 sm:p-6">
            <p className="self-start text-xs font-semibold tracking-wide text-muted-foreground uppercase">Quét bằng app ngân hàng hoặc ví</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL sinh tại server, không qua tối ưu ảnh */}
            <img src={qr} alt={`Mã VietQR chuyển ${formatVnd(order.total)} cho đơn ${order.code}`} width={280} height={280} className="aspect-square w-full max-w-[280px] border border-border bg-white" />
            <a href={qr} download={`vietqr-${order.code}.png`} className={cn(buttonVariants({ variant: "ink-outline", size: "md" }), "w-full")}>
              <DownloadIcon aria-hidden /> Tải mã QR về máy
            </a>
            <p className="text-center text-xs text-muted-foreground">Mã đã gồm sẵn số tiền và nội dung, quét được trên mọi ứng dụng Mobile Banking.</p>
          </section>

          {/* Thông tin chuyển khoản */}
          <section aria-labelledby="transfer-info" className="border border-border bg-card p-5 sm:p-6">
            <h2 id="transfer-info" className="font-sans text-base font-semibold">
              Hoặc chuyển khoản thủ công
            </h2>
            <div className="mt-2">
              <div className="border-b border-border py-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ngân hàng</p>
                <p className="mt-0.5 text-nav font-semibold">{account.name}</p>
              </div>
              <div className="border-b border-border py-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Chủ tài khoản</p>
                <p className="mt-0.5 text-nav font-semibold break-words">{account.accountName}</p>
              </div>
              <CopyRow label="Số tài khoản" value={formatAccountNo(account.accountNo)} copyValue={account.accountNo} />
              <CopyRow label="Số tiền" value={formatVnd(order.total)} copyValue={String(order.total)} emphasis />
              <CopyRow label="Nội dung chuyển khoản" value={content} />
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs font-semibold text-sidebar-foreground">
              <span aria-hidden className="mt-1 size-2 shrink-0 bg-warning" />
              Giữ nguyên số tiền và nội dung để cửa hàng đối soát nhanh. Chuyển sai nội dung có thể làm chậm xác nhận.
            </p>
          </section>
        </div>

        {/* Hướng dẫn */}
        <section aria-labelledby="how-to" className="border border-border bg-card p-5 sm:p-6">
          <h2 id="how-to" className="font-sans text-base font-semibold">
            Cách thực hiện
          </h2>
          <ol className="mt-3 grid gap-3 text-label text-sidebar-foreground sm:grid-cols-3">
            {[
              "Mở app ngân hàng hoặc ví, chọn Quét mã QR và quét mã ở trên (hoặc nhập thông tin bên cạnh).",
              "Kiểm tra số tiền và nội dung đã điền sẵn, rồi xác nhận chuyển.",
              "Quay lại đây bấm “Tôi đã chuyển khoản”. Cửa hàng xác nhận khi tiền về và trang này tự cập nhật.",
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className="grid size-7 shrink-0 place-items-center bg-ink text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Hành động */}
        <section aria-label="Xác nhận đã chuyển khoản" className="space-y-4 border border-border bg-card p-5 sm:p-6">
          <ReportTransferButton orderId={order.id} reportedAt={reportedAt?.toISOString() ?? null} />
          <p role="status" className="text-center text-xs text-muted-foreground">
            Đang chờ cửa hàng xác nhận thanh toán. Bạn có thể đóng trang này, đơn vẫn được giữ đến hạn.
          </p>
          <Link href={`/account/orders/${order.id}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full bg-card")}>
            Xem chi tiết đơn hàng
          </Link>
        </section>
      </div>
    </div>
  )
}

function TransferExpired({ code, total }: { code: string; total: number }) {
  return (
    <div className="pb-16">
      <div className="mx-auto mt-8 max-w-[560px] border border-border bg-card px-6 py-12 text-center sm:px-10">
        <h1 className="text-3xl font-semibold">Đơn hàng đã hết hạn thanh toán</h1>
        <p className="mt-3 text-label text-muted-foreground">
          Đơn <b className="text-foreground">#{code}</b> • {formatVnd(total)}
        </p>
        <p role="alert" className="mt-4 text-label font-semibold text-destructive">
          Đơn đã bị huỷ và sản phẩm đã được trả lại kho vì chưa được xác nhận thanh toán trong thời hạn. Bạn có thể đặt lại đơn mới.
        </p>
        <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full")}>
          Tiếp tục mua sắm
        </Link>
        <Link href="/account/orders" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-3 w-full bg-card")}>
          Xem đơn hàng của tôi
        </Link>
      </div>
    </div>
  )
}

const RESULT_TITLE: Record<string, string> = {
  failed: "Thanh toán không thành công",
  invalid: "Không xác thực được kết quả thanh toán",
  expired: "Đơn hàng đã hết hạn thanh toán",
  unconfigured: "Thanh toán VNPay hiện chưa khả dụng",
}

// Đơn VNPAY chưa thanh toán xong: hiện kết quả lần thử vừa rồi và cho thanh toán lại trong cửa sổ 15 phút.
function VnpayStatus({
  order,
  search,
}: {
  order: NonNullable<Awaited<ReturnType<typeof getOrder>>>
  search: { result?: string; code?: string }
}) {
  const cancelled = order.status === "CANCELLED"
  const title = cancelled ? RESULT_TITLE.expired : (RESULT_TITLE[search.result ?? ""] ?? "Đơn hàng đang chờ thanh toán VNPay")
  const detail = cancelled
    ? "Đơn hàng đã bị huỷ và sản phẩm đã được trả lại kho vì chưa thanh toán trong thời hạn. Bạn có thể đặt lại đơn mới."
    : search.result === "failed"
      ? (VNPAY_RESPONSE_MESSAGE[search.code ?? ""] ?? "Giao dịch không thành công.")
      : null
  const deadline = new Date(order.createdAt.getTime() + PAYMENT_WINDOW_MINUTES * 60_000)

  return (
    <div className="pb-16">
      <div className="mx-auto mt-8 max-w-[560px] rounded-3xl border border-border bg-card px-6 py-12 text-center sm:px-10">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-label text-muted-foreground">
          Đơn <b className="text-foreground">#{order.code}</b> • {formatVnd(order.total)}
        </p>
        {detail && <p role="alert" className="mt-4 text-label font-semibold text-destructive">{detail}</p>}
        {!cancelled && (
          <>
            <p className="mt-4 text-label text-muted-foreground">
              Đơn sẽ tự huỷ nếu chưa thanh toán trước{" "}
              <b className="text-foreground">
                {deadline.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}
              </b>{" "}
              ({PAYMENT_WINDOW_MINUTES} phút kể từ lúc đặt).
            </p>
            {search.result !== "unconfigured" && (
              <a href={`/api/payment/vnpay/pay?orderId=${order.id}`} className={`${buttonVariants({ size: "lg" })} mt-8 w-full`}>
                Thanh toán lại với VNPay
              </a>
            )}
          </>
        )}
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-4 w-full bg-card")}>
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}


