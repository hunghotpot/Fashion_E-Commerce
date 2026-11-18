import { describe, expect, it } from "vitest"
import { paymentAccountSchema } from "@/lib/validators/admin-payment"
import { formatRemaining } from "@/components/checkout/payment-countdown"
import { BANKS, findBank, formatAccountNo } from "./banks"
import { buildVietQrPayload, crc16 } from "./vietqr"

describe("danh sách ngân hàng", () => {
  it("mã BIN gồm 6 chữ số và không trùng; tìm được theo BIN", () => {
    expect(BANKS.every((b) => /^\d{6}$/.test(b.bin))).toBe(true)
    expect(new Set(BANKS.map((b) => b.bin)).size).toBe(BANKS.length)
    expect(findBank("970422")?.shortName).toBe("MB Bank")
    expect(findBank("000000")).toBeUndefined()
  })
  it("định dạng số tài khoản theo nhóm 4", () => {
    expect(formatAccountNo("999988882026")).toBe("9999 8888 2026")
  })
})

describe("paymentAccountSchema", () => {
  const ok = { bankBin: "970422", accountNo: "0123 456 789", accountName: "Trần Thị Bé" }
  it("chuẩn hoá: bỏ khoảng trắng số tài khoản, tên HOA không dấu (cả chữ đ)", () => {
    const r = paymentAccountSchema.parse({ ...ok, accountName: "Đặng Thị Bé" })
    expect(r.accountNo).toBe("0123456789")
    expect(r.accountName).toBe("DANG THI BE")
  })
  it("từ chối số tài khoản không phải số hoặc sai độ dài", () => {
    for (const accountNo of ["", "12345", "abc123456", "1".repeat(20)]) expect(paymentAccountSchema.safeParse({ ...ok, accountNo }).success).toBe(false)
  })
  it("từ chối ngân hàng ngoài danh sách và tên có ký tự lạ", () => {
    expect(paymentAccountSchema.safeParse({ ...ok, bankBin: "123456" }).success).toBe(false)
    expect(paymentAccountSchema.safeParse({ ...ok, accountName: "A<script>" }).success).toBe(false)
  })
})

describe("mã VietQR dùng chung client/server", () => {
  it("payload kết thúc bằng CRC đúng và chứa số tiền, nội dung", () => {
    const p = buildVietQrPayload({ bankBin: "970422", accountNo: "999988882026", amount: 100000, content: "FSTHU" })
    expect(p.slice(-4)).toBe(crc16(p.slice(0, -4)))
    expect(p).toContain("100000")
    expect(p).toContain("FSTHU")
  })
})

describe("formatRemaining", () => {
  it("giờ, phút, giây; dưới một giờ bỏ phần giờ; không âm", () => {
    expect(formatRemaining(23 * 3600_000 + 41 * 60_000 + 5_000)).toBe("23 giờ 41 phút 05 giây")
    expect(formatRemaining(59 * 60_000 + 1_000)).toBe("59 phút 01 giây")
    expect(formatRemaining(-5000)).toBe("0 phút 00 giây")
  })
})
