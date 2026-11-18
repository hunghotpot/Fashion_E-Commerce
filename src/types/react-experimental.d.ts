// Bản React đi kèm Next khi bật experimental.viewTransition (next.config.ts) xuất component này với tên `unstable_ViewTransition`,
// còn kiểu của @types/react chỉ khai báo `ViewTransition`. Khai báo bổ sung để import đúng tên chạy thật có kiểu.
import "react"

declare module "react" {
  export const unstable_ViewTransition: typeof ViewTransition
}
