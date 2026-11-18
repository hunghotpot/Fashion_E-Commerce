/*
 * Menu chính của cửa hàng (header màn lớn và ngăn kéo ba gạch). Ba mục đầu cuộn tới mục tương ứng trên trang chủ
 * (từ trang khác thì về trang chủ rồi cuộn); "Giới thiệu" là trang riêng.
 */
export const NAV_LINKS = [
  { href: "/#san-pham-moi", label: "Hàng mới về" },
  { href: "/#bo-suu-tap", label: "Bộ sưu tập" },
  { href: "/#noi-bat", label: "Nổi bật" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
] as const
