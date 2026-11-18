import {
  BellIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  FolderTreeIcon,
  PackageIcon,
  RulerIcon,
  SettingsIcon,
  TicketPercentIcon,
  UserRoundIcon,
  type LucideIcon,
} from "lucide-react"

/*
 * Menu và tiêu đề trang Admin: MỘT nguồn cho sidebar, breadcrumb và tiêu đề.
 */
export interface AdminNavItem {
  href: string
  label: string
  /** Tiêu đề trang (h1). */
  title: string
  /** Mục cuối của breadcrumb. */
  crumb: string
  icon: LucideIcon
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Tổng quan", title: "Tổng Quan Kinh Doanh", crumb: "Tổng quan", icon: ChartColumnIcon },
  { href: "/admin/orders", label: "Quản lý Đơn hàng", title: "Quản Lý Đơn Hàng", crumb: "Quản lý Đơn hàng", icon: ClipboardListIcon },
  { href: "/admin/products", label: "Tồn kho & Sản phẩm", title: "Quản Lý Tồn Kho & Sản Phẩm", crumb: "Quản lý Tồn kho", icon: PackageIcon },
  { href: "/admin/categories", label: "Danh mục", title: "Quản Lý Danh Mục", crumb: "Danh mục", icon: FolderTreeIcon },
  { href: "/admin/size-charts", label: "Bảng size", title: "Quản Lý Bảng Size", crumb: "Bảng size", icon: RulerIcon },
  { href: "/admin/customers", label: "Quản lý Khách hàng", title: "Quản Lý Tài Khoản Khách Hàng", crumb: "Quản lý Khách hàng", icon: UserRoundIcon },
  { href: "/admin/vouchers", label: "Voucher & Khuyến mãi", title: "Quản Lý Mã Giảm Giá & Khuyến Mãi", crumb: "Mã Voucher & Khuyến mãi", icon: TicketPercentIcon },
  { href: "/admin/settings", label: "Cài đặt hệ thống", title: "Cài Đặt Hệ Thống", crumb: "Cài đặt hệ thống", icon: SettingsIcon },
]

/** Mục menu đang mở theo pathname ("/admin" chỉ khớp đúng chính nó). */
/** Trang không nằm ở sidebar nhưng vẫn cần tiêu đề/breadcrumb riêng (mở từ chuông). */
const NOTIFICATIONS_PAGE: AdminNavItem = {
  href: "/admin/notifications",
  label: "Thông báo",
  title: "Thông Báo",
  crumb: "Thông báo",
  icon: BellIcon,
}

export function activeAdminNav(pathname: string): AdminNavItem {
  if (pathname === NOTIFICATIONS_PAGE.href) return NOTIFICATIONS_PAGE
  const hit = ADMIN_NAV.find((n) => (n.href === "/admin" ? pathname === "/admin" : pathname === n.href || pathname.startsWith(`${n.href}/`)))
  return hit ?? ADMIN_NAV[0]
}

/** Nhãn trạng thái đơn trong Admin: CONFIRMED hiển thị là "Đang đóng gói". */
export const ADMIN_ORDER_STATUS_LABEL = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đang đóng gói",
  SHIPPING: "Đang giao",
  DELIVERED: "Hoàn thành",
  CANCELLED: "Đã hủy",
} as const

/** Màu pill (xem StatusPill): chờ = vàng, đóng gói = xanh dương, đang giao = xanh lá, hoàn thành = xám, huỷ = đỏ nhạt. */
export const ADMIN_ORDER_STATUS_TONE = {
  PENDING: "warning",
  CONFIRMED: "info",
  SHIPPING: "success",
  DELIVERED: "neutral",
  CANCELLED: "danger",
} as const
