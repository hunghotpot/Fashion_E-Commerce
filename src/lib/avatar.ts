/*
 * Ảnh đại diện: hằng số và hàm thuần dùng chung server/client.
 * Ba loại (enum AvatarKind trong schema): INITIALS (chữ cái đầu + màu, mặc định), GENERATED (DiceBear sinh từ style + seed,
 * phục vụ ở /avatars/<style>?seed=...) và UPLOADED (ảnh khách tải lên, lưu ở public/uploads/avatars).
 */

export const AVATAR_KINDS = ["INITIALS", "GENERATED", "UPLOADED"] as const
export type AvatarKind = (typeof AVATAR_KINDS)[number]

/** Màu nền chữ cái đầu: khoá → lớp Tailwind theo token (không mã màu cứng). Mọi cặp nền/chữ đạt ≥ 4.5:1. */
export const AVATAR_COLORS = {
  ink: { label: "Nâu than", className: "bg-ink text-white" },
  brass: { label: "Vàng đồng", className: "bg-brand text-white" },
  stone: { label: "Xám đá", className: "bg-muted-foreground text-white" },
  sage: { label: "Xanh lục", className: "bg-success text-white" },
  blue: { label: "Xanh dương", className: "bg-info text-white" },
  cream: { label: "Kem", className: "bg-brand-soft text-brand-strong ring-1 ring-inset ring-border-strong" },
} as const
export type AvatarColor = keyof typeof AVATAR_COLORS
export const AVATAR_COLOR_KEYS = Object.keys(AVATAR_COLORS) as AvatarColor[]
export const DEFAULT_AVATAR_COLOR: AvatarColor = "ink"

/** Kiểu DiceBear cho phép: chỉ các bộ giấy phép CC0/MIT (không cần ghi công). Khoá = tên bộ trong @dicebear/collection. */
export const AVATAR_STYLES = {
  shapes: "Hình khối",
  rings: "Vòng tròn",
  thumbs: "Mặt cười",
  glass: "Kính mờ",
  identicon: "Lưới",
  lorelei: "Chân dung",
  notionists: "Phác hoạ",
  pixelArt: "Điểm ảnh",
} as const
export type AvatarStyle = keyof typeof AVATAR_STYLES
export const AVATAR_STYLE_KEYS = Object.keys(AVATAR_STYLES) as AvatarStyle[]

/** Hạt giống: chuỗi chữ và số, đủ dài để không đoán được; chính là phần duy nhất lưu vào DB cho ảnh tạo sẵn. */
export const AVATAR_SEED_PATTERN = /^[A-Za-z0-9]{6,32}$/

/** Ảnh tải lên chỉ nhận đúng dạng server sinh: /uploads/avatars/<uuid>.<jpg|png|webp>. */
export const AVATAR_UPLOAD_URL = /^\/uploads\/avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

/** Ảnh đại diện của một người dùng, đúng các cột avatar* trong bảng User. */
export interface AvatarData {
  kind: AvatarKind
  color: AvatarColor | null
  style: AvatarStyle | null
  seed: string | null
  url: string | null
}

export const DEFAULT_AVATAR: AvatarData = { kind: "INITIALS", color: null, style: null, seed: null, url: null }

export const isAvatarColor = (v: unknown): v is AvatarColor => typeof v === "string" && v in AVATAR_COLORS
export const isAvatarStyle = (v: unknown): v is AvatarStyle => typeof v === "string" && v in AVATAR_STYLES

/** Dựng AvatarData từ các cột của User; giá trị lạ/hỏng rơi về chữ cái đầu để không bao giờ hiện ảnh sai. */
export function avatarFromRow(row: {
  avatarKind: string
  avatarColor: string | null
  avatarStyle: string | null
  avatarSeed: string | null
  avatarUrl: string | null
}): AvatarData {
  const color = isAvatarColor(row.avatarColor) ? row.avatarColor : null
  if (row.avatarKind === "GENERATED" && isAvatarStyle(row.avatarStyle) && row.avatarSeed && AVATAR_SEED_PATTERN.test(row.avatarSeed)) {
    return { kind: "GENERATED", color, style: row.avatarStyle, seed: row.avatarSeed, url: null }
  }
  if (row.avatarKind === "UPLOADED" && row.avatarUrl && AVATAR_UPLOAD_URL.test(row.avatarUrl)) {
    return { kind: "UPLOADED", color, style: null, seed: null, url: row.avatarUrl }
  }
  return { ...DEFAULT_AVATAR, color }
}

/** Địa chỉ ảnh để hiển thị (null = vẽ chữ cái đầu). */
export function avatarSrc(a: AvatarData): string | null {
  if (a.kind === "GENERATED" && a.style && a.seed) return generatedAvatarUrl(a.style, a.seed)
  if (a.kind === "UPLOADED" && a.url) return a.url
  return null
}

export const generatedAvatarUrl = (style: AvatarStyle, seed: string) => `/avatars/${style}?seed=${encodeURIComponent(seed)}`

/** Chữ cái đầu: hai chữ (đầu họ + đầu tên) với tên nhiều từ, một chữ với tên một từ; in hoa. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = [...parts[0]][0] ?? ""
  const last = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? "") : ""
  return (first + last).toUpperCase()
}

/** Hạt giống ngẫu nhiên mới (12 ký tự chữ và số), chạy được cả ở trình duyệt lẫn Node. */
export function randomAvatarSeed(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")
}
