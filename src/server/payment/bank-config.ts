import "server-only"

/*
 * Tài khoản nhận chuyển khoản MẶC ĐỊNH từ .env (BANK_*). Chỉ dùng khi Admin chưa lưu tài khoản ở Cài đặt > Thanh toán
 * (xem payment-account.service.ts). Giá trị mặc định chỉ là DỮ LIỆU MẪU: hãy cấu hình tài khoản thật, nếu không khách sẽ chuyển tiền
 * tới tài khoản không phải của bạn.
 */
export const envBankConfig = {
  name: process.env.BANK_NAME ?? "MB Bank",
  bin: process.env.BANK_BIN ?? "970422",
  accountNo: (process.env.BANK_ACCOUNT_NO ?? "999988882026").replace(/\s/g, ""),
  accountName: process.env.BANK_ACCOUNT_NAME ?? "CONG TY TNHH FASHION STORE",
}
