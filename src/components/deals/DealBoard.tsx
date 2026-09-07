"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { GripVertical, Trash2 } from "lucide-react";
import { DEAL_STAGES, STAGE_LABELS, STAGE_COLORS, formatMoney } from "@/lib/utils";

export type BoardDeal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  contactName: string | null;
  contactId: string | null;
  companyName: string | null;
  campaignName: string | null;
};

export function DealBoard({ deals }: { deals: BoardDeal[] }) {
  const router = useRouter();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  // Optimistic stage overrides so the card moves instantly on drop
  const [moved, setMoved] = useState<Record<string, string>>({});

  const stageOf = (d: BoardDeal) => moved[d.id] ?? d.stage;

  async function moveTo(stage: string) {
    if (!dragId) return;
    const deal = deals.find((d) => d.id === dragId);
    setOverStage(null);
    setDragId(null);
    if (!deal || stageOf(deal) === stage) return;
    setMoved((m) => ({ ...m, [deal.id]: stage }));
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this deal?")) return;
    await fetch(`/api/deals/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {DEAL_STAGES.map((stage) => {
        const items = deals.filter((d) => stageOf(d) === stage);
        const total = items.reduce((s, d) => s + d.value, 0);
        return (
          <div
            key={stage}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage);
            }}
            onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
            onDrop={() => moveTo(stage)}
            className={`w-72 shrink-0 rounded-xl border-t-4 bg-slate-100/70 ${STAGE_COLORS[stage]} ${
              overStage === stage ? "ring-2 ring-brand-400" : ""
            }`}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-semibold text-slate-700">{STAGE_LABELS[stage]}</span>
              <span className="text-xs text-slate-500">
                {items.length} · {formatMoney(total)}
              </span>
            </div>
            <div className="min-h-[120px] space-y-2 px-2 pb-2">
              {items.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={() => setDragId(d.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`card group cursor-grab p-3 active:cursor-grabbing ${
                    dragId === d.id ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{d.title}</div>
                      <div className="truncate text-xs text-slate-500">
                        {[d.contactName, d.companyName].filter(Boolean).join(" · ") || "Unassigned"}
                      </div>
                    </div>
                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      {formatMoney(d.value, d.currency)}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
                      {d.contactId && (
                        <Link href={`/contacts/${d.contactId}`} className="text-[11px] font-medium text-brand-600 hover:underline">
                          contact
                        </Link>
                      )}
                      <button onClick={() => remove(d.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {d.campaignName && (
                    <div className="mt-1.5">
                      <span className="badge bg-brand-50 text-brand-700">{d.campaignName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
