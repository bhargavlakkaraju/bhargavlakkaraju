import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "green" | "blue" | "red" | "amber";
const TONES: Record<Tone, string> = {
  neutral: "border-white/15 bg-white/5 text-white/70",
  green: "border-brand-green/40 bg-brand-green/15 text-brand-green-light",
  blue: "border-brand-blue-light/40 bg-brand-blue-light/15 text-sky-300",
  red: "border-red-400/40 bg-red-500/15 text-red-300",
  amber: "border-amber-400/40 bg-amber-500/15 text-amber-200",
};

export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", TONES[tone], className)} {...props} />;
}
