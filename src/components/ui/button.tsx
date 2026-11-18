import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

/*
 * Square corners (icon sizes stay circular), semibold. Sizes: sm 32 (Duyệt / Chi tiết) · default 40 (MUA NGAY)
 * md 44 (Áp dụng) · lg 52 (ĐẶT HÀNG NGAY) · xl 60 (ĐĂNG NHẬP)
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Brand CTA — MUA NGAY, ĐẶT HÀNG NGAY, Lưu Sản Phẩm
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // Ink — ĐĂNG NHẬP, Áp dụng, Duyệt
        dark: "bg-ink text-white hover:bg-ink/90",
        // Social login, bordered on surface
        outline:
          "border-border bg-surface text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        // Hủy bỏ, Chi tiết, Xem Store
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-border aria-expanded:bg-border",
        ghost:
          "text-foreground hover:bg-secondary aria-expanded:bg-secondary",
        // Nút viền ink (cặp với nút dark): viền vẽ bằng inset shadow nên không đụng border của nút; đổ ink khi rê chuột.
        "ink-outline":
          "bg-transparent text-foreground shadow-[inset_0_0_0_1.5px_var(--color-ink)] hover:bg-ink hover:text-white focus-visible:bg-ink focus-visible:text-white",
        // Đăng xuất
        destructive:
          "bg-destructive-soft text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 rounded-none px-6 text-sm pointer-coarse:h-11 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xs: "h-6 rounded-none gap-1 px-3 text-2xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-none px-4 text-xs pointer-coarse:h-11 [&_svg:not([class*='size-'])]:size-3.5",
        md: "h-11 rounded-none px-6 text-sm",
        lg: "h-[52px] rounded-none px-8 text-sm uppercase",
        xl: "h-[60px] rounded-none px-10 text-sm uppercase",
        icon: "size-9 rounded-full p-0 pointer-coarse:size-11",
        "icon-sm": "size-8 rounded-full p-0 pointer-coarse:size-11",
        "icon-lg": "size-11 rounded-full p-0",
      },
      // Rectangular (rounded-xl) shape — Áp dụng, Xem Store, Đăng xuất, size chips
      shape: {
        pill: "",
        rounded: "rounded-xl",
      },
    },
    compoundVariants: [
      { variant: "link", className: "h-auto p-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "pill",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  shape = "pill",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
