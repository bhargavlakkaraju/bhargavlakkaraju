"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  Megaphone,
  Upload,
  Plug,
  Zap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav: { href: string; label: string; icon: LucideIcon; ai?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Prospects", icon: Users },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/deals", label: "Pipeline", icon: Kanban },
  { href: "/campaigns", label: "Outreach", icon: Megaphone },
  { href: "/automations", label: "Automations", icon: Sparkles, ai: true },
  { href: "/import", label: "Import Lists", icon: Upload },
  { href: "/settings", label: "API & Integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-200 bg-slate-50/50">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-900">Hoopla CRM</div>
          <div className="text-[11px] text-slate-400">new-business engine</div>
        </div>
      </Link>
      <nav className="mt-1 flex-1 space-y-0.5 px-3">
        {nav.map(({ href, label, icon: Icon, ai }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-white text-slate-900 shadow-[inset_0_0_0_1px_theme(colors.slate.200)]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-slate-700" : "text-slate-400")} />
              {label}
              {ai && <span className="ai-chip ml-auto">AI</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-5 py-4 text-[11px] text-slate-400">
        One source of truth. No more sheets.
      </div>
    </aside>
  );
}
