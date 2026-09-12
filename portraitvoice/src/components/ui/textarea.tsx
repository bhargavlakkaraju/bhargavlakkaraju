import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex w-full rounded-xl border border-line bg-black/30 px-3 py-2 text-sm leading-relaxed text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
