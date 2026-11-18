import "server-only"
import { findBank } from "@/lib/banks"
import { adminContextSchema, type AdminContext } from "@/lib/validators/admin-catalog"
import { paymentAccountSchema, type PaymentAccountInput } from "@/lib/validators/admin-payment"
import { db } from "@/server/db"
import { parseInput } from "./admin-catalog.service"
import { getPaymentAccount, PAYMENT_ACCOUNT_ID, type PaymentAccount } from "./payment-account.service"

/*
 * Admin: cập nhật tài khoản nhận chuyển khoản. Service không tự kiểm quyền (Server Action gọi getAdminUser() trước).
 * Chỉ MỘT dòng cấu hình (id "default"): upsert. Tên ngân hàng lấy từ danh sách theo mã BIN, không tin chuỗi client gửi.
 */
export async function updatePaymentAccount(admin: AdminContext, input: PaymentAccountInput): Promise<PaymentAccount> {
  parseInput(adminContextSchema, admin)
  const data = parseInput(paymentAccountSchema, input)
  const bank = findBank(data.bankBin)! // schema đã đảm bảo tồn tại
  const row = { bankBin: bank.bin, bankName: bank.shortName, accountNo: data.accountNo, accountName: data.accountName }
  await db.paymentAccount.upsert({ where: { id: PAYMENT_ACCOUNT_ID }, create: { id: PAYMENT_ACCOUNT_ID, ...row }, update: row })
  return getPaymentAccount()
}
