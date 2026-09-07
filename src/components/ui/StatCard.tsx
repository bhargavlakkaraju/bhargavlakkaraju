import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "brand" | "emerald" | "amber" | "sky";
}) {
  const tones: Record<string, string> = {
    brand: "from-brand-500 to-fuchsia-600 shadow-brand-500/30",
    emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/30",
    amber: "from-amber-500 to-orange-600 shadow-amber-500/30",
    sky: "from-sky-500 to-blue-600 shadow-sky-500/30",
  };
  return (
    <div className="card card-hover flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="truncate text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}
