import type { AvatarData } from "@/lib/avatar"

/* Phần thuần (không DB) của đánh giá sản phẩm: kiểu dữ liệu dùng chung server/client và hàm tiện ích. */

/** Số ảnh tối đa kèm mỗi đánh giá. */
export const REVIEW_MAX_IMAGES = 3

/** Ảnh đánh giá chỉ nhận đúng dạng server sinh: /uploads/reviews/<uuid>.<jpg|png|webp>. */
export const REVIEW_IMAGE_URL = /^\/uploads\/reviews\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

export interface ReviewItem {
  id: string
  rating: number
  content: string | null
  /** Đường dẫn ảnh kèm theo, theo thứ tự khách sắp xếp. */
  images: string[]
  createdAt: Date
  /** Đã sửa sau khi gửi. */
  edited: boolean
  /** Tên đã che bớt, xem maskReviewerName. */
  authorName: string
  avatar: AvatarData
}

export interface RatingSummary {
  /** Trung bình 1 chữ số thập phân; 0 khi chưa có đánh giá. */
  average: number
  count: number
}

export interface ReviewSummary extends RatingSummary {
  /** Số đánh giá theo từng mức sao, khoá "1".."5". */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export const EMPTY_RATING: RatingSummary = { average: 0, count: 0 }

/** Làm tròn trung bình sao tới 1 chữ số thập phân. */
export function roundAverage(sum: number, count: number): number {
  return count > 0 ? Math.round((sum / count) * 10) / 10 : 0
}

/** "4,5" (dấu phẩy kiểu Việt, luôn 1 chữ số thập phân). */
export function formatRating(average: number): string {
  return average.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** Nhãn chữ cho từng mức sao, để người dùng không phải đoán 3 sao là tốt hay tệ. */
export const RATING_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Rất tệ",
  2: "Chưa tốt",
  3: "Bình thường",
  4: "Tốt",
  5: "Rất tốt",
}

/**
 * Che tên khách khi hiển thị công khai: giữ nguyên tên gọi (từ cuối), các từ còn lại rút thành chữ cái đầu.
 * "Nguyễn Văn An" → "N. V. An"; một từ giữ nguyên; rỗng → "Khách hàng".
 */
export function maskReviewerName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "Khách hàng"
  if (words.length === 1) return words[0]
  const given = words[words.length - 1]
  const initials = words.slice(0, -1).map((w) => `${Array.from(w)[0]!.toLocaleUpperCase("vi-VN")}.`)
  return `${initials.join(" ")} ${given}`
}
