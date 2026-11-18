import { createCn } from "cn/config"

// Giống `cn` mặc định, nhưng biết các cỡ chữ tự định nghĩa trong globals.css (`@theme`: --text-2xs/caption/label/nav).
// Nếu không khai báo, `text-label` bị coi là màu chữ và bị `text-foreground` (cùng chuỗi) xoá mất.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["2xs", "caption", "label", "nav"] }],
    },
  },
})
