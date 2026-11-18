import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

/*
 * Two shapes:
 *  - tag  (rounded-sm, solid) — product "NEW" / "-20%"
 *  - pill (rounded-full, soft tint) — order/stock status, stat delta
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent font-semibold whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/25 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // soft pills
        default: "bg-secondary text-sidebar-foreground",
        brand: "bg-brand-soft text-primary",
        danger: "bg-destructive-soft text-destructive",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        info: "bg-info-soft text-info",
        // solid
        dark: "bg-ink text-white",
        solid: "bg-primary text-primary-foreground",
        outline: "border-border bg-transparent text-foreground",
      },
      shape: {
        pill: "h-6 rounded-none px-3 text-[length:var(--text-caption)] leading-[1.4]",
        tag: "h-[21px] rounded-sm px-2.5 text-[length:var(--text-2xs)] leading-[1.4]",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "pill",
    },
  }
)

function Badge({
  className,
  variant = "default",
  shape = "pill",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, shape }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }

