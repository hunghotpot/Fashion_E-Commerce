import { unstable_ViewTransition as ViewTransition } from "react"

// Template tạo bản mới mỗi lần đổi trang nên đây là "trang vào/ra" thật: mờ dần. Cuộn tới #mục trên cùng trang, đổi bộ lọc
// hay cập nhật nội dung không tạo bản mới, nên không chạy hiệu ứng (nếu chạy, trình duyệt thay trang bằng ảnh chụp đứng và
// làm cuộn mượt bị khựng).
export default function ShopTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition default="none" enter="auto" exit="auto">
      {children}
    </ViewTransition>
  )
}
