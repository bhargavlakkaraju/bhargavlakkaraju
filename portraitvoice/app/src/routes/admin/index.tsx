import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@higgsfield/quanta/button";
import { Tag } from "@higgsfield/quanta/tag";
import { Typography } from "@higgsfield/quanta/typography";
import { BrandBar } from "@/components/portraitvoice/brand-bar";
import { listAdminEntries } from "@/lib/portraitvoice/pipeline.functions";
import { formatDate } from "@/lib/portraitvoice/format";
import { languageLabel, type TestimonialEntry } from "@/lib/portraitvoice/types";

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

function StatusTag({ status }: { status: TestimonialEntry["status"] }) {
  const color = status === "completed" ? "success" : status === "failed" ? "error" : "warning";
  return <Tag color={color}>{status}</Tag>;
}

function MediaLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-q-text-disabled">—</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-q-text-link underline-offset-2 hover:underline">
      {label}
    </a>
  );
}

function AdminEntriesPage() {
  const { entries, error } = Route.useLoaderData();
  return (
    <main className="min-h-dvh bg-q-background-primary text-q-text-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <BrandBar active="home" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Typography as="h1" variant="headline-sm-semi-bold" color="primary">All entries</Typography>
            <Typography as="p" variant="body-sm-regular" color="secondary">
              Internal screen. It is reachable only by URL and is not linked anywhere; there is no login beyond that.
            </Typography>
          </div>
          <Button variant="tertiary" size="md" as="a" href="/admin/usage">AI usage</Button>
        </div>
        {error ? (
          <Typography as="p" variant="body-sm-regular" color="danger" role="alert">{error}</Typography>
        ) : (
          <div className="overflow-x-auto rounded-q-400 border border-q-border-subtle">
            <table className="w-full min-w-[1100px] border-collapse text-left text-q-caption-sm-regular">
              <thead className="bg-q-background-secondary text-q-caption-sm-medium text-q-text-secondary">
                <tr>
                  {["Created", "Status", "Stage", "Mode", "Language", "Voice", "Engine", "Portrait", "Audio", "Video", "Script", "Error", "Updated"].map((header) => (
                    <th key={header} className="whitespace-nowrap px-3 py-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-6 text-center text-q-text-tertiary">No entries yet.</td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="border-t border-q-border-subtle align-top">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(entry.created_at)}</td>
                      <td className="px-3 py-2"><StatusTag status={entry.status} /></td>
                      <td className="px-3 py-2">{entry.current_stage ?? "—"}</td>
                      <td className="px-3 py-2">{entry.input_mode}</td>
                      <td className="px-3 py-2">{languageLabel(entry.language)}</td>
                      <td className="px-3 py-2">{entry.voice_gender ?? "—"}</td>
                      <td className="px-3 py-2">{entry.video_engine ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <MediaLink href={entry.source_portrait_url} label="source" />
                          <MediaLink href={entry.portrait_url} label="reframed" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <MediaLink href={entry.audio_url} label={entry.audio_seconds ? `${Math.round(entry.audio_seconds)}s` : "audio"} />
                      </td>
                      <td className="px-3 py-2"><MediaLink href={entry.video_url} label="video" /></td>
                      <td className="max-w-[280px] px-3 py-2"><span className="line-clamp-3">{entry.script_text ?? "—"}</span></td>
                      <td className="max-w-[240px] px-3 py-2 text-q-text-danger"><span className="line-clamp-3">{entry.error_message ?? "—"}</span></td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(entry.updated_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
