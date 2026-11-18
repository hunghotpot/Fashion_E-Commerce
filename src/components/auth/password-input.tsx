"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { Input } from "@/components/ui/input"

// Ô mật khẩu có nút mắt để hiện/ẩn. Chỉ đổi `type` của ô nhập ở trình duyệt, không đụng giá trị hay form.
export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = React.useState(false)
  const Icon = visible ? EyeOffIcon : EyeIcon

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        aria-pressed={visible}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 grid size-8 pointer-coarse:size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Icon className="size-4" aria-hidden />
      </button>
    </div>
  )
}
