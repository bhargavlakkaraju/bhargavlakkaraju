"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CONTACT_STATUSES } from "@/lib/utils";

type ActionDraft = {
  type: "SET_STATUS" | "ADD_TAG" | "CREATE_TASK" | "CREATE_DEAL" | "WEBHOOK";
  value?: string;
  title?: string;
  url?: string;
  dealValue?: string;
};

const ACTION_LABELS: Record<ActionDraft["type"], string> = {
  SET_STATUS: "Set status",
  ADD_TAG: "Add tag",
  CREATE_TASK: "Create follow-up task",
  CREATE_DEAL: "Open a deal",
  WEBHOOK: "Send webhook (push to another tool)",
};

export function AutomationForm({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<"CONTACT_CREATED" | "STATUS_CHANGED">("CONTACT_CREATED");
  const [campaign, setCampaign] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [minScore, setMinScore] = useState("");
  const [actions, setActions] = useState<ActionDraft[]>([{ type: "CREATE_TASK", value: "" }]);

  function updateAction(i: number, patch: Partial<ActionDraft>) {
    setActions((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payloadActions = actions.map((a) => {
      switch (a.type) {
        case "CREATE_DEAL":
          return { type: a.type, title: a.title ?? "", ...(a.dealValue ? { value: Number(a.dealValue) } : {}) };
        case "WEBHOOK":
          return { type: a.type, url: a.url ?? "" };
        default:
          return { type: a.type, value: a.value ?? "" };
      }
    });
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        trigger,
        conditions: {
          ...(campaign ? { campaign } : {}),
          ...(source ? { source } : {}),
          ...(status ? { status } : {}),
          ...(minScore ? { minScore: Number(minScore) } : {}),
        },
        actions: payloadActions,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Check the rule — every action needs its fields filled in (webhook needs a full URL).");
      return;
    }
    setOpen(false);
    setName("");
    setActions([{ type: "CREATE_TASK", value: "" }]);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Sparkles className="h-4 w-4" /> New automation
      </button>
      <Modal title="New automation" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="label">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Hot chatbot leads → task + tag" />
          </div>

          <div>
            <label className="label">When</label>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as typeof trigger)} className="input">
              <option value="CONTACT_CREATED">A new contact arrives</option>
              <option value="STATUS_CHANGED">A contact&apos;s status changes</option>
            </select>
          </div>

          <div>
            <label className="label">Only if (leave blank to match all)</label>
            <div className="grid grid-cols-2 gap-2">
              <select value={campaign} onChange={(e) => setCampaign(e.target.value)} className="input">
                <option value="">Any campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input value={source} onChange={(e) => setSource(e.target.value)} className="input" placeholder="Source, e.g. chatbot" />
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                <option value="">Any status</option>
                {CONTACT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input value={minScore} onChange={(e) => setMinScore(e.target.value)} type="number" min={0} max={100} className="input" placeholder="Min AI score" />
            </div>
          </div>

          <div>
            <label className="label">Then</label>
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={a.type}
                      onChange={(e) => updateAction(i, { type: e.target.value as ActionDraft["type"] })}
                      className="input"
                    >
                      {Object.entries(ACTION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {actions.length > 1 && (
                      <button type="button" onClick={() => setActions((x) => x.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {a.type === "SET_STATUS" && (
                    <select value={a.value ?? ""} onChange={(e) => updateAction(i, { value: e.target.value })} className="input" required>
                      <option value="">Choose status…</option>
                      {CONTACT_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  )}
                  {a.type === "ADD_TAG" && (
                    <input value={a.value ?? ""} onChange={(e) => updateAction(i, { value: e.target.value })} className="input" placeholder="Tag, e.g. hot-lead" required />
                  )}
                  {a.type === "CREATE_TASK" && (
                    <input value={a.value ?? ""} onChange={(e) => updateAction(i, { value: e.target.value })} className="input" placeholder="Task, e.g. Call within 24h" required />
                  )}
                  {a.type === "CREATE_DEAL" && (
                    <div className="grid grid-cols-3 gap-2">
                      <input value={a.title ?? ""} onChange={(e) => updateAction(i, { title: e.target.value })} className="input col-span-2" placeholder="Deal title" required />
                      <input value={a.dealValue ?? ""} onChange={(e) => updateAction(i, { dealValue: e.target.value })} type="number" className="input" placeholder="Value ₹" />
                    </div>
                  )}
                  {a.type === "WEBHOOK" && (
                    <input value={a.url ?? ""} onChange={(e) => updateAction(i, { url: e.target.value })} type="url" className="input" placeholder="https://hooks.zapier.com/…" required />
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setActions((a) => [...a, { type: "ADD_TAG", value: "" }])}
                className="btn-secondary w-full justify-center !py-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add another action
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Creating…" : "Create automation"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
