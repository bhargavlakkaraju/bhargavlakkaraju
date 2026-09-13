import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-white/10",
        className,
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#009830,#3fd36f,#9ff0b8,#3fd36f,#009830)] bg-[length:200%_100%] shadow-[0_0_18px_rgba(63,211,111,0.6)] transition-[width] duration-700 ease-out animate-shimmer"
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
