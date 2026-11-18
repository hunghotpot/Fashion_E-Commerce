/*
 * Ngân hàng nhận chuyển khoản qua VietQR (mã BIN theo danh sách công khai của VietQR, chỉ giữ ngân hàng thương mại nhận chuyển nhanh 24/7).
 * Admin chọn ngân hàng ở Cài đặt > Thanh toán; mã BIN đi vào mã QR nên phải đúng.
 */
export interface Bank {
  bin: string
  shortName: string
  name: string
}

export const BANKS: readonly Bank[] = [
  { bin: "970415", shortName: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam" },
  { bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại Thương Việt Nam" },
  { bin: "970418", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { bin: "970405", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam" },
  { bin: "970448", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { bin: "970422", shortName: "MB Bank", name: "Ngân hàng TMCP Quân đội" },
  { bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam" },
  { bin: "970416", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { bin: "970403", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh" },
  { bin: "970454", shortName: "VietCapitalBank", name: "Ngân hàng TMCP Bản Việt" },
  { bin: "970429", shortName: "SCB", name: "Ngân hàng TMCP Sài Gòn" },
  { bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { bin: "970443", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { bin: "970431", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
  { bin: "970426", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải" },
  { bin: "970400", shortName: "SaigonBank", name: "Ngân hàng TMCP Sài Gòn Công Thương" },
  { bin: "970409", shortName: "BacABank", name: "Ngân hàng TMCP Bắc Á" },
  { bin: "970412", shortName: "PVcomBank", name: "Ngân hàng TMCP Đại Chúng Việt Nam" },
  { bin: "970419", shortName: "NCB", name: "Ngân hàng TMCP Quốc Dân" },
  { bin: "970424", shortName: "Shinhan Bank", name: "Ngân hàng TNHH MTV Shinhan Việt Nam" },
  { bin: "970425", shortName: "ABBANK", name: "Ngân hàng TMCP An Bình" },
  { bin: "970427", shortName: "VietABank", name: "Ngân hàng TMCP Việt Á" },
  { bin: "970428", shortName: "NamABank", name: "Ngân hàng TMCP Nam Á" },
  { bin: "970430", shortName: "PGBank", name: "Ngân hàng TMCP Thịnh vượng và Phát triển" },
  { bin: "970433", shortName: "VietBank", name: "Ngân hàng TMCP Việt Nam Thương Tín" },
  { bin: "970438", shortName: "BaoVietBank", name: "Ngân hàng TMCP Bảo Việt" },
  { bin: "970440", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { bin: "970446", shortName: "COOPBANK", name: "Ngân hàng Hợp tác xã Việt Nam" },
  { bin: "970449", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam" },
  { bin: "970452", shortName: "KienLongBank", name: "Ngân hàng TMCP Kiên Long" },
]

export const findBank = (bin: string): Bank | undefined => BANKS.find((b) => b.bin === bin)

/** 999988882026 → "9999 8888 2026". */
export const formatAccountNo = (no: string) => no.replace(/(.{4})/g, "$1 ").trim()
