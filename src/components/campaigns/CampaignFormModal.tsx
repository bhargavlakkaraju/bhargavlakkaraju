"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function CampaignFormModal({
  campaign,
}: {
  campaign?: { id: string; name: string; client: string | null; status: string; notes: string | null };
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
    const res = await fetch(campaign ? `/api/campaigns/${campaign.id}` : "/api/campaigns", {
      method: campaign ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not save campaign");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {campaign ? (
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New campaign
        </button>
      )}
      <Modal title={campaign ? "Edit campaign" : "New campaign"} open={open} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Campaign name *</label>
            <input name="name" required defaultValue={campaign?.name} className="input" placeholder="Pexalon Q4" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client</label>
              <input name="client" defaultValue={campaign?.client ?? ""} className="input" placeholder="Syngenta" />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={campaign?.status ?? "ACTIVE"} className="input">
                <option>ACTIVE</option>
                <option>PAUSED</option>
                <option>COMPLETED</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" rows={3} defaultValue={campaign?.notes ?? ""} className="input resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
