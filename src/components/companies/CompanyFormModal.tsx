"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function CompanyFormModal({
  company,
}: {
  company?: {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    location: string | null;
    notes: string | null;
  };
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
    const res = await fetch(company ? `/api/companies/${company.id}` : "/api/companies", {
      method: company ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not save company");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {company ? (
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add company
        </button>
      )}
      <Modal title={company ? "Edit company" : "New company"} open={open} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input name="name" required defaultValue={company?.name} className="input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Website / domain</label>
              <input name="domain" defaultValue={company?.domain ?? ""} className="input" placeholder="acme.com" />
            </div>
            <div>
              <label className="label">Industry</label>
              <input name="industry" defaultValue={company?.industry ?? ""} className="input" placeholder="Agritech" />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input name="location" defaultValue={company?.location ?? ""} className="input" placeholder="Mumbai" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea name="notes" rows={3} defaultValue={company?.notes ?? ""} className="input resize-none" />
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
