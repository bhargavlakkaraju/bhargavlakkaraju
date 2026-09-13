import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { listAdminEntries, moreAdminEntries } from "@/server/fns";
import { languageLabel } from "@/lib/languages";
import { formatDate } from "@/lib/utils";
export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Entries — PortraitVoice internal" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content: "Internal testimonial generation records.",
      },
    ],
  }),
  loader: () => listAdminEntries(),
  component: Admin,
});
function Admin() {
  const initial = Route.useLoaderData();
  const storage = initial.storage;
  const [entries, setEntries] = useState(initial.entries);
  const [hasMore, setHasMore] = useState(initial.entries.length === 300);
  const [loading, setLoading] = useState(false);
  async function loadMore() {
    setLoading(true);
    try {
      const page = await moreAdminEntries({ data: { offset: entries.length } });
      setEntries((e) => [...e, ...page]);
      setHasMore(page.length === 300);
    } catch {
      toast.error("Could not load more entries. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AdminShell
      title="Testimonial entries"
      description={`${entries.length} entries · ${storage === "supabase" ? "Supabase connected" : storage === "cloud" ? "Cloud storage connected" : "Local development storage"}`}
    >
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {[
                "Portrait",
                "Status / stage",
                "Language",
                "Voice / mode",
                "Testimonial",
                "Audio",
                "Video",
                "Created",
                "Updated",
                "Completed",
                "Error",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    {(e.portrait_url || e.source_portrait_url) && (
                      <a
                        href={e.portrait_url ?? e.source_portrait_url ?? ""}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={e.portrait_url ?? e.source_portrait_url ?? ""}
                          alt="Portrait"
                        />
                      </a>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${e.status}`}>
                      {e.status}
                    </span>
                    <p>{e.current_stage}</p>
                  </td>
                  <td>{languageLabel(e.language)}</td>
                  <td>
                    {e.voice_gender ?? "Original"} · {e.input_mode}
                    <p>{e.voice_name}</p>
                  </td>
                  <td className="error-cell">
                    {e.script_text ?? "Uploaded audio"}
                  </td>
                  <td>
                    {e.audio_url ? (
                      <audio src={e.audio_url} controls preload="none" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {e.video_url ? (
                      <a href={e.video_url} target="_blank" rel="noreferrer">
                        Watch ↗
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatDate(e.created_at)}</td>
                  <td>{formatDate(e.updated_at)}</td>
                  <td>{formatDate(e.completed_at)}</td>
                  <td className="error-cell">{e.error_message ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="admin-empty">
                  No entries yet. Requests will appear here as they are created.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => void loadMore()}
          style={{ marginTop: 20 }}
        >
          {loading ? "Loading…" : "Load more entries"}
        </Button>
      )}
    </AdminShell>
  );
}
