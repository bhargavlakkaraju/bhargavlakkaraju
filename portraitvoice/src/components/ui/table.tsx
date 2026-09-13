import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10">
      <table
        className={cn(
          "w-full min-w-[720px] border-collapse text-left text-sm",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function THead({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "bg-white/5 text-[11px] uppercase tracking-wider text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody className={cn("divide-y divide-white/8", className)} {...props} />
  );
}

export function TR({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("align-top transition hover:bg-white/[0.03]", className)}
      {...props}
    />
  );
}

export function TH({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th className={cn("px-3 py-2.5 font-semibold", className)} {...props} />
  );
}

export function TD({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-3 py-2.5 text-foreground/85", className)}
      {...props}
    />
  );
}
