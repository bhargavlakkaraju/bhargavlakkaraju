import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        neutral: "border-white/15 bg-white/5 text-foreground/80",
        success: "border-brand-leaf/40 bg-brand-green/20 text-brand-mint",
        warning: "border-amber-400/40 bg-amber-400/15 text-amber-200",
        danger: "border-destructive/40 bg-destructive/15 text-destructive",
        info: "border-sky-400/40 bg-sky-400/15 text-sky-200",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
