"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACTIVITY_TYPES } from "@/lib/utils";

export function ActivityComposer({ contactId, dealId }: { contactId?: string; dealId?: string }) {
  const router = useRouter();
  const [type, setType] = useState<string>("NOTE");
  const [content, setContent] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content, contactId, dealId, dueAt: dueAt || undefined }),
    });
    setSaving(false);
    setContent("");
    setDueAt("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        {ACTIVITY_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              type === t
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={type === "TASK" ? "What needs to be done?" : "Log a note, call summary, meeting outcome…"}
        className="input resize-none"
      />
      <div className="flex items-center justify-between">
        {type === "TASK" ? (
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="input w-56"
          />
        ) : (
          <span />
        )}
        <button type="submit" disabled={saving || !content.trim()} className="btn-primary">
          {saving ? "Saving…" : "Log activity"}
        </button>
      </div>
    </form>
  );
}
