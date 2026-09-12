import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { languageLabel, type TestimonialEntry } from "@/lib/types";
import { listAdminEntries } from "@/server/fns";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Entries · PortraitVoice admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal PortraitVoice entries dashboard." },
    ],
  }),
  loader: async () => {
    const result = await listAdminEntries();
    return result.ok ? { entries: result.value, error: null } : { entries: [], error: result.error.message };
  },
  component: AdminEntriesPage,
});

const HEADERS = ["Created", "Status", "Stage", "Mode", "Language", "Voice", "Portrait", "Audio", "Video", "Script", "Error", "Updated"];

function StatusBadge({ status }: { status: TestimonialEntry["status"] }) {
  return <Badge tone={status === "completed" ? "green" : status === "failed" ? "red" : "amber"}>{status}</Badge>;
}

function MediaLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-white/30">—</span>;
  return <a href={href} target="_blank" rel="noreferrer" className="text-brand-green-light underline-offset-2 hover:underline">{label}</a>;
}

function AdminEntriesPage() {
  const { entries, error } = Route.useLoaderData();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All entries</h1>
          <p className="mt-1 text-sm text-white/60">Internal screen. Reachable only by URL, not linked anywhere, and protected only by that obscurity.</p>
        </div>
        <Button variant="secondary" asChild><a href="/admin/usage">AI usage</a></Button>
      </div>
      {error ? (
        <p className="mt-6 text-sm text-red-200" role="alert">{error}</p>
      ) : (
        <div className="glass-card mt-6 overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
            <thead className="bg-white/5 text-white/60">
              <tr>{HEADERS.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={HEADERS.length} className="px-3 py-6 text-center text-white/50">No entries yet.</td></tr>
              ) : entries.map((entry) => (
                <tr key={entry.id} className="border-t border-line align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(entry.created_at)}</td>
                  <td className="px-3 py-2"><StatusBadge status={entry.status} /></td>
                  <td className="px-3 py-2">{entry.current_stage ?? "—"}</td>
                  <td className="px-3 py-2">{entry.input_mode}</td>
                  <td className="px-3 py-2">{languageLabel(entry.language)}</td>
                  <td className="px-3 py-2">{entry.voice_gender ?? "—"}{entry.voice_name ? ` · ${entry.voice_name}` : ""}</td>
                  <td className="px-3 py-2"><div className="flex flex-col gap-1"><MediaLink href={entry.source_portrait_url} label="source" /><MediaLink href={entry.portrait_url} label="reframed" /></div></td>
                  <td className="px-3 py-2"><MediaLink href={entry.audio_url} label={entry.audio_seconds ? `${Math.round(entry.audio_seconds)}s` : "audio"} /></td>
                  <td className="px-3 py-2"><MediaLink href={entry.video_url} label="video" /></td>
                  <td className="max-w-[280px] px-3 py-2"><span className="line-clamp-3">{entry.script_text ?? "—"}</span></td>
                  <td className="max-w-[240px] px-3 py-2 text-red-300"><span className="line-clamp-3">{entry.error_message ?? "—"}</span></td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(entry.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
