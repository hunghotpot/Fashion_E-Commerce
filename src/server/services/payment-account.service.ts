import "server-only"
import { findBank } from "@/lib/banks"
import { db } from "@/server/db"
import { envBankConfig } from "@/server/payment/bank-config"

/** Tài khoản nhận chuyển khoản đang dùng cho mã QR. `source`: "db" = Admin đã cấu hình, "env" = mặc định từ .env. */
export interface PaymentAccount {
  name: string
  bin: string
  accountNo: string
  accountName: string
  source: "db" | "env"
}

export const PAYMENT_ACCOUNT_ID = "default"

/** Ưu tiên tài khoản Admin lưu trong DB; chưa có thì dùng BANK_* trong .env. */
export async function getPaymentAccount(): Promise<PaymentAccount> {
  const row = await db.paymentAccount.findUnique({ where: { id: PAYMENT_ACCOUNT_ID } })
  if (row) return { name: findBank(row.bankBin)?.shortName ?? row.bankName, bin: row.bankBin, accountNo: row.accountNo, accountName: row.accountName, source: "db" }
  return { ...envBankConfig, source: "env" }
}
