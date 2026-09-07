"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { DEAL_STAGES, STAGE_LABELS } from "@/lib/utils";

type Option = { id: string; name: string };

export function DealFormModal({
  contacts,
  companies,
  campaigns,
}: {
  contacts: Option[];
  companies: Option[];
  campaigns: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not create deal");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        <Plus className="h-4 w-4" /> New deal
      </button>
      <Modal title="New deal" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input name="title" required className="input" placeholder="Pexalon retainer renewal" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Value</label>
              <input name="value" type="number" min="0" step="1000" defaultValue={0} className="input" />
            </div>
            <div>
              <label className="label">Currency</label>
              <select name="currency" defaultValue="INR" className="input">
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Stage</label>
              <select name="stage" defaultValue="LEAD_IN" className="input">
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Expected close</label>
              <input name="expectedClose" type="date" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contact</label>
              <select name="contactId" defaultValue="" className="input">
                <option value="">—</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Company</label>
              <select name="companyId" defaultValue="" className="input">
                <option value="">—</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Campaign</label>
            <select name="campaignId" defaultValue="" className="input">
              <option value="">—</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Creating…" : "Create deal"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
