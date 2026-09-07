import { format } from "date-fns";
import { Sparkles, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { AutomationForm } from "@/components/automations/AutomationForm";
import { AutomationToggle } from "@/components/automations/AutomationToggle";
import { DeleteButton } from "@/components/contacts/RowActions";

export const dynamic = "force-dynamic";

const TRIGGER_LABELS: Record<string, string> = {
  CONTACT_CREATED: "New prospect arrives",
  STATUS_CHANGED: "Stage changes",
};

function describeConditions(json: string) {
  try {
    const c = JSON.parse(json) as Record<string, unknown>;
    const parts = [
      c.campaign && `campaign is "${c.campaign}"`,
      c.source && `source is "${c.source}"`,
      c.status && `status is ${c.status}`,
      c.minScore != null && `AI score ≥ ${c.minScore}`,
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "always";
  } catch {
    return "always";
  }
}

function describeActions(json: string) {
  try {
    const actions = JSON.parse(json) as Record<string, string | number>[];
    return actions.map((a) => {
      switch (a.type) {
        case "SET_STATUS":
          return `set status → ${a.value}`;
        case "ADD_TAG":
          return `tag +${a.value}`;
        case "CREATE_TASK":
          return `task "${a.value}"`;
        case "CREATE_DEAL":
          return `open deal "${a.title}"`;
        case "WEBHOOK":
          return `webhook → ${String(a.url).replace(/^https?:\/\//, "").split("/")[0]}`;
        default:
          return String(a.type);
      }
    });
  } catch {
    return [];
  }
}

export default async function AutomationsPage() {
  const [automations, runs, campaigns] = await Promise.all([
    prisma.automation.findMany({
      include: { _count: { select: { runs: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.automationRun.findMany({
      include: { automation: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.campaign.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Rules that run the moment data hits the CRM — no code, no copy-pasting between tools."
        action={<AutomationForm campaigns={campaigns} />}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {automations.map((a) => (
            <div key={a.id} className="card card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/15 to-fuchsia-500/15 text-brand-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-slate-500">
                      {a._count.runs} run{a._count.runs === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AutomationToggle id={a.id} enabled={a.enabled} />
                  <DeleteButton url={`/api/automations/${a.id}`} label="" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="badge bg-slate-900 text-white">{TRIGGER_LABELS[a.trigger] ?? a.trigger}</span>
                <span className="text-slate-400">if</span>
                <span className="badge bg-slate-100 text-slate-600">{describeConditions(a.conditions)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                {describeActions(a.actions).map((d, i) => (
                  <span key={i} className="badge bg-brand-50 text-brand-700">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {!automations.length && (
            <div className="card flex flex-col items-center gap-3 py-16 text-center">
              <Sparkles className="h-8 w-8 text-brand-400" />
              <div className="text-sm text-slate-500">
                No automations yet. Try: <span className="font-medium text-slate-700">&quot;When a prospect replies → create a &apos;book intro call&apos; task and tag them hot.&quot;</span>
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Run history</h2>
          <ul className="space-y-2.5">
            {runs.map((r) => (
              <li key={r.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{r.automation.name}</span>
                  <span className={`badge shrink-0 ${r.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {r.status}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {r.contactName ?? "—"} · {r.detail}
                </div>
                <div className="text-[11px] text-slate-400">{format(r.createdAt, "d MMM, HH:mm:ss")}</div>
              </li>
            ))}
            {!runs.length && <li className="py-8 text-center text-sm text-slate-400">No runs yet.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
