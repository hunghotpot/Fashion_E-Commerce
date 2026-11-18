import "server-only"
import wardsData from "@/data/vn-address/wards.json"
import { findProvince } from "@/lib/vn-address"

/*
 * Kiểm tra Phường/Xã thuộc đúng Tỉnh/Thành (danh sách phường/xã chỉ nằm ở server, ~140KB, không đưa vào bundle client).
 * Địa chỉ lưu theo TÊN (không theo mã) để đơn cũ giữ nguyên nội dung dù danh sách sau này đổi.
 */
const WARDS = wardsData as Record<string, { code: string; name: string }[]>

/** Phường/xã của một tỉnh (theo tên tỉnh); tỉnh không có trong danh sách thì rỗng. */
export function listWards(provinceName: string): string[] {
  const p = findProvince(provinceName)
  return p ? (WARDS[p.code] ?? []).map((w) => w.name).sort((a, b) => a.localeCompare(b, "vi")) : []
}

export function isValidWard(provinceName: string, wardName: string): boolean {
  const p = findProvince(provinceName)
  return !!p && (WARDS[p.code] ?? []).some((w) => w.name === wardName)
}

/** Lỗi theo từng ô (khoá `province`/`ward`) nếu cặp tỉnh–phường không hợp lệ, ngược lại null. */
export function validateAddressUnits(a: { province: string; ward: string }): Record<string, string> | null {
  if (!findProvince(a.province)) return { province: "Vui lòng chọn Tỉnh/Thành phố trong danh sách" }
  if (!isValidWard(a.province, a.ward)) return { ward: "Vui lòng chọn Phường/Xã thuộc tỉnh/thành đã chọn" }
  return null
}
