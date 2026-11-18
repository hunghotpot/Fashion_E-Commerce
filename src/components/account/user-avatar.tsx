import { AVATAR_COLORS, avatarSrc, DEFAULT_AVATAR_COLOR, initialsOf, type AvatarData } from "@/lib/avatar"
import { cn } from "@/lib/cn"

/**
 * Ảnh đại diện tròn dùng chung (header, sidebar, Admin, chuông): ảnh tạo sẵn hoặc ảnh tải lên thì hiện `<img>`,
 * còn lại vẽ chữ cái đầu của tên trên nền màu đã chọn (mặc định nâu than). Cỡ do `className` quyết định (size-* và text-*).
 * Mặc định trang trí (aria-hidden) vì tên người luôn có chữ kèm theo; chỗ chỉ có ảnh thì đặt `label` để trình đọc màn hình đọc được.
 */
export function UserAvatar({
  name,
  avatar,
  label,
  className,
}: {
  name: string
  avatar: AvatarData
  label?: string
  className?: string
}) {
  const src = avatarSrc(avatar)
  const color = AVATAR_COLORS[avatar.color ?? DEFAULT_AVATAR_COLOR]
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-semibold select-none",
        src ? "bg-secondary" : color.className,
        className
      )}
    >
      {src ? (
        // Ảnh SVG tạo sẵn hoặc ảnh người dùng đã được nén: không đi qua tối ưu ảnh của Next.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={128} height={128} loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}
