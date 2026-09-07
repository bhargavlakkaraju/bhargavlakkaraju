"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CONTACT_STATUSES, STATUS_LABELS } from "@/lib/utils";

type Option = { id: string; name: string };

export function ContactFormModal({
  companies,
  campaigns,
  contact,
  trigger,
}: {
  companies: Option[];
  campaigns: Option[];
  contact?: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    title: string | null;
    status: string;
    tags: string | null;
    companyId: string | null;
    campaignId: string | null;
  };
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch(contact ? `/api/contacts/${contact.id}` : "/api/contacts", {
      method: contact ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Could not save contact");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <button className="btn-primary">
            <Plus className="h-4 w-4" /> Add prospect
          </button>
        )}
      </span>
      <Modal title={contact ? "Edit prospect" : "New prospect"} open={open} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name *</label>
              <input name="firstName" required defaultValue={contact?.firstName} className="input" />
            </div>
            <div>
              <label className="label">Last name</label>
              <input name="lastName" defaultValue={contact?.lastName ?? ""} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" defaultValue={contact?.email ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" defaultValue={contact?.phone ?? ""} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Job title</label>
              <input name="title" defaultValue={contact?.title ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" defaultValue={contact?.status ?? "PROSPECT"} className="input">
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <select name="companyId" defaultValue={contact?.companyId ?? ""} className="input">
                <option value="">—</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Campaign</label>
              <select name="campaignId" defaultValue={contact?.campaignId ?? ""} className="input">
                <option value="">—</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Tags (comma separated)</label>
            <input name="tags" defaultValue={contact?.tags ?? ""} className="input" placeholder="vip, follow-up" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : contact ? "Save changes" : "Create contact"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
