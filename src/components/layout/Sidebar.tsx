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
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/deals", label: "Deals", icon: Kanban },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/import", label: "Import Sheets", icon: Upload },
  { href: "/settings", label: "API & Integrations", icon: Plug },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-slate-800 bg-slate-950 text-slate-300">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-base font-bold text-white">Hoopla CRM</div>
          <div className="text-[11px] text-slate-500">agency command center</div>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-1 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-600/20 text-brand-300"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-slate-600">
        One source of truth. No more sheets.
      </div>
    </aside>
  );
}
