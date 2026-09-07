import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiKeyManager } from "@/components/settings/ApiKeyManager";

export const dynamic = "force-dynamic";

const INGEST_EXAMPLE = `curl -X POST https://YOUR-CRM-DOMAIN/api/v1/ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Asha Patel",
    "email": "asha@example.com",
    "phone": "+91 98xxxxxx01",
    "company": "Syngenta",
    "campaign": "Pexalon",
    "source": "chatbot",
    "note": "Asked about pricing on the landing page",
    "customData": { "crop": "cotton", "district": "Nagpur" }
  }'`;

const BATCH_EXAMPLE = `{
  "contacts": [
    { "name": "Lead One", "email": "one@x.com", "campaign": "Tej/Page" },
    { "name": "Lead Two", "phone": "+91 97xxxxxx02", "campaign": "Tej/Page" }
  ]
}`;

export default async function SettingsPage() {
  const [keys, events] = await Promise.all([
    prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.ingestEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  return (
    <div>
      <PageHeader
        title="API & Integrations"
        description="Create a key per tool, point it at the ingest endpoint, and data lands in the CRM automatically."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">API keys</h2>
            <ApiKeyManager
              keys={keys.map((k) => ({
                ...k,
                createdAt: k.createdAt.toISOString(),
                lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
              }))}
            />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">How other tools push data in</h2>
            <div className="space-y-4 text-sm text-slate-600">
              <p>
                Any tool that can send an HTTP request — Zapier, Make, Google Apps Script, your chatbot backend,
                a landing-page form — can push leads with a single <code className="rounded bg-slate-100 px-1">POST</code>:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
                {INGEST_EXAMPLE}
              </pre>
              <ul className="list-inside list-disc space-y-1 text-xs">
                <li>Contacts are matched by <strong>email</strong> (then phone) — pushing twice updates, never duplicates.</li>
                <li><strong>company</strong> and <strong>campaign</strong> are auto-created by name if they don&apos;t exist.</li>
                <li>Anything in <strong>customData</strong> is stored and shown on the contact page.</li>
                <li>Optionally include a <strong>deal</strong> object to open a pipeline deal in the same call.</li>
              </ul>
              <p className="text-xs">
                Batch mode — send up to 500 at once:
              </p>
              <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-200">
                {BATCH_EXAMPLE}
              </pre>
              <p className="text-xs">
                Read data back with <code className="rounded bg-slate-100 px-1">GET /api/v1/contacts?campaign=Pexalon&amp;status=NEW</code> using the same key.
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Incoming data log</h2>
          <p className="mb-4 text-xs text-slate-500">
            Every push from every tool is recorded here, so you can debug an integration without guessing.
          </p>
          <ul className="space-y-2">
            {events.map((e) => {
              const result = e.result ? JSON.parse(e.result) : null;
              return (
                <li key={e.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{e.apiKeyName ?? "Unknown"}</span>
                    <span
                      className={`badge ${
                        e.status === "PROCESSED"
                          ? "bg-emerald-100 text-emerald-700"
                          : e.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {e.endpoint} · {format(e.createdAt, "d MMM yyyy, HH:mm:ss")}
                    {result && typeof result === "object" && (
                      <span>
                        {" · "}
                        {Object.entries(result)
                          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                          .join(", ")
                          .slice(0, 120)}
                      </span>
                    )}
                  </div>
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[11px] text-brand-600">payload</summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-600">
                      {e.payload}
                    </pre>
                  </details>
                </li>
              );
            })}
            {!events.length && (
              <li className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400">
                Nothing received yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
