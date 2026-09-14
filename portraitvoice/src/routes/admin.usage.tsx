import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin-shell";
import { listUsage } from "@/server/fns";
export const Route = createFileRoute("/admin/usage")({
  head: () => ({
    meta: [
      { title: "AI usage — PortraitVoice internal" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Internal credit usage by provider, model, and generation stage.",
      },
    ],
  }),
  loader: () => listUsage(),
  component: Usage,
});
function Usage() {
  const data = Route.useLoaderData();
  return (
    <AdminShell
      title="AI usage"
      description="Generation usage across every stage of a story."
    >
      <div className="usage-total">
        <div>
          <span>Current generator</span>
          <strong>
            HeyGen <small>Avatar IV</small>
          </strong>
        </div>
        <div>
          <span>Recorded events</span>
          <strong>{data.totalEvents}</strong>
        </div>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {["Provider", "Model", "Stage", "Events", "Units", "Billing"].map(
                (h) => (
                  <th key={h}>{h}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.summary.length ? (
              data.summary.map((r) => (
                <tr key={`${r.provider}-${r.model}-${r.stage}`}>
                  <td>{r.provider}</td>
                  <td>{r.model}</td>
                  <td>{r.stage}</td>
                  <td>{r.events}</td>
                  <td>
                    {r.units.toFixed(2)} {r.unit_type}
                  </td>
                  <td>
                    {r.provider === "Higgsfield"
                      ? `${r.credits.toFixed(3)} legacy credits`
                      : "See provider billing"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="admin-empty">
                  No generation usage recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="usage-footnote">
        HeyGen handles Avatar IV and ElevenLabs v3 in one render. Counts show
        submitted usage, not an invoice. Note reading uses Vercel AI Gateway.
        Historical provider records remain here; new videos use HeyGen only.
      </p>
    </AdminShell>
  );
}
