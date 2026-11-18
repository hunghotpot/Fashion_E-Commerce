import provincesData from "@/data/vn-address/provinces.json"

/*
 * Đơn vị hành chính sau sáp nhập (từ 01/07/2025): chỉ còn Tỉnh/Thành phố và Phường/Xã/Đặc khu, không có cấp quận/huyện.
 * Dữ liệu: src/data/vn-address (34 tỉnh/thành, 3.321 phường/xã; nguồn quangtam/vietnam-address-database, MIT, theo Nghị quyết 202/2025/QH15).
 * File này CHỈ chứa danh sách tỉnh (nhỏ) để dùng được cả ở client; danh sách phường/xã nằm ở src/server/address/units.ts (server).
 */

export interface Province {
  code: string
  name: string
}

/** 34 tỉnh/thành, xếp theo bảng chữ cái tiếng Việt. */
export const PROVINCES: readonly Province[] = [...(provincesData as Province[])].sort((a, b) => a.name.localeCompare(b.name, "vi"))

export function findProvince(name: string): Province | undefined {
  return PROVINCES.find((p) => p.name === name)
}

/**
 * Số nhà, tên đường: không có dữ liệu đường phố chuẩn nên chỉ kiểm tra HÌNH THỨC. Phải có ít nhất 1 chữ cái và chỉ gồm chữ, số,
 * khoảng trắng và `, . / - ' # ( )`; chặn chuỗi toàn dấu câu như `,.:` hay chỉ có số.
 */
export const STREET_PATTERN = /^[\p{L}\p{N}\s,./\-'#()]+$/u
export function isPlausibleStreet(value: string): boolean {
  return value.length >= 3 && STREET_PATTERN.test(value) && /\p{L}/u.test(value)
}
