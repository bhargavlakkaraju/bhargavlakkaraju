import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber } from "@/lib/format";
import { listAdminUsage } from "@/server/fns";

export const Route = createFileRoute("/admin/usage")({
  head: () => ({
    meta: [
      { title: "AI usage · PortraitVoice admin" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal PortraitVoice AI credit usage dashboard." },
    ],
  }),
  loader: async () => {
    const result = await listAdminUsage();
    return result.ok ? { summary: result.value.summary, events: result.value.events, error: null } : { summary: [], events: [], error: result.error.message };
  },
  component: AdminUsagePage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function AdminUsagePage() {
  const { summary, events, error } = Route.useLoaderData();
  const totals = summary.reduce((acc, row) => ({ events: acc.events + Number(row.events), credits: acc.credits + Number(row.credits) }), { events: 0, credits: 0 });
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI usage</h1>
          <p className="mt-1 text-sm text-white/60">Credits per provider, model and stage. One credit is one US cent of list price at the rates in the app config.</p>
        </div>
        <Button variant="secondary" asChild><a href="/admin">Entries</a></Button>
      </div>
      {error ? (
        <p className="mt-6 text-sm text-red-200" role="alert">{error}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Total credits" value={formatNumber(totals.credits)} />
            <Stat label="Billable events" value={formatNumber(totals.events, 0)} />
            <Stat label="Groups" value={String(summary.length)} />
          </div>

          <h2 className="mt-8 text-lg font-semibold">By provider, model and stage</h2>
          <div className="glass-card mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead className="bg-white/5 text-white/60">
                <tr>{["Provider", "Model", "Stage", "Events", "Units", "Credits"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {summary.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-white/50">No usage recorded yet.</td></tr>
                ) : summary.map((row) => (
                  <tr key={`${row.provider}-${row.model}-${row.stage}`} className="border-t border-line">
                    <td className="px-3 py-2">{row.provider}</td>
                    <td className="px-3 py-2 font-mono">{row.model}</td>
                    <td className="px-3 py-2">{row.stage}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(Number(row.events), 0)}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(Number(row.units))}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(Number(row.credits))}</td>
                  </tr>
                ))}
                {summary.length > 0 ? (
                  <tr className="border-t border-white/20 bg-white/5 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>Total</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(totals.events, 0)}</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2 tabular-nums">{formatNumber(totals.credits)}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <h2 className="mt-8 text-lg font-semibold">Recent events</h2>
          <div className="glass-card mt-3 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-xs">
              <thead className="bg-white/5 text-white/60">
                <tr>{["Time", "Entry", "Provider", "Model", "Stage", "Units", "Credits"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-white/50">No events yet.</td></tr>
                ) : events.map((event) => (
                  <tr key={event.id} className="border-t border-line">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(event.created_at)}</td>
                    <td className="px-3 py-2 font-mono">{event.entry_id ? event.entry_id.slice(0, 8) : "—"}</td>
                    <td className="px-3 py-2">{event.provider}</td>
                    <td className="px-3 py-2 font-mono">{event.model}</td>
                    <td className="px-3 py-2">{event.stage}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(Number(event.units))} {event.unit_type}</td>
                    <td className="px-3 py-2 tabular-nums">{formatNumber(Number(event.credits))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
