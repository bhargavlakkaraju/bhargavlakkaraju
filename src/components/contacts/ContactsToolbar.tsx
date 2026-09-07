"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { CONTACT_STATUSES, STATUS_LABELS } from "@/lib/utils";

export function ContactsToolbar({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    value ? next.set(key, value) : next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          defaultValue={params.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Search name, email, phone…"
          className="input w-72 pl-9"
        />
      </div>
      <select
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        className="input w-40"
      >
        <option value="">All stages</option>
        {CONTACT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <select
        value={params.get("campaign") ?? ""}
        onChange={(e) => setParam("campaign", e.target.value)}
        className="input w-48"
      >
        <option value="">All campaigns</option>
        {campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
