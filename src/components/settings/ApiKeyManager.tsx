"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Copy, Check, Ban } from "lucide-react";

type Key = {
  id: string;
  name: string;
  key: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export function ApiKeyManager({ keys }: { keys: Key[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setCreating(false);
    setName("");
    router.refresh();
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this key? Tools using it will stop working immediately.")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function copy(k: Key) {
    navigator.clipboard.writeText(k.key);
    setCopiedId(k.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <form onSubmit={create} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. Syngenta chatbot, Zapier, Landing page"
          className="input"
        />
        <button type="submit" disabled={creating || !name.trim()} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> Create key
        </button>
      </form>
      <ul className="space-y-2">
        {keys.map((k) => (
          <li
            key={k.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
              k.revoked ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200"
            }`}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {k.name}
                {k.revoked && <span className="badge ml-2 bg-red-100 text-red-600">revoked</span>}
              </div>
              <code className="block truncate font-mono text-xs text-slate-500">{k.key}</code>
              <div className="text-[11px] text-slate-400">
                {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleString()}` : "Never used"}
              </div>
            </div>
            {!k.revoked && (
              <div className="flex shrink-0 gap-2">
                <button onClick={() => copy(k)} className="btn-secondary !px-3 !py-1.5">
                  {copiedId === k.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === k.id ? "Copied" : "Copy"}
                </button>
                <button onClick={() => revoke(k.id)} className="btn-danger !px-3 !py-1.5">
                  <Ban className="h-3.5 w-3.5" /> Revoke
                </button>
              </div>
            )}
          </li>
        ))}
        {!keys.length && (
          <li className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
            No API keys yet. Create one per tool so you can revoke them independently.
          </li>
        )}
      </ul>
    </div>
  );
}
