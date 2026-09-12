import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@higgsfield/quanta/button";
import { Typography } from "@higgsfield/quanta/typography";
import { BrandBar } from "@/components/portraitvoice/brand-bar";
import { listAdminUsage } from "@/lib/portraitvoice/pipeline.functions";
import { formatDate, formatNumber } from "@/lib/portraitvoice/format";

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
    return result.ok
      ? { summary: result.value.summary, events: result.value.events, error: null }
      : { summary: [], events: [], error: result.error.message };
  },
  component: AdminUsagePage,
});

function AdminUsagePage() {
  const { summary, events, error } = Route.useLoaderData();
  const totals = summary.reduce(
    (acc, row) => ({ events: acc.events + row.events, credits: acc.credits + row.credits }),
    { events: 0, credits: 0 },
  );
  return (
    <main className="min-h-dvh bg-q-background-primary text-q-text-primary">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <BrandBar active="home" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Typography as="h1" variant="headline-sm-semi-bold" color="primary">AI usage</Typography>
            <Typography as="p" variant="body-sm-regular" color="secondary">
              Higgsfield display credits per provider, model and stage. Extraction runs on the platform LLM rail, which does not report a credit price, so it is listed with token units and zero credits.
            </Typography>
          </div>
          <Button variant="tertiary" size="md" as="a" href="/admin">Entries</Button>
        </div>
        {error ? (
          <Typography as="p" variant="body-sm-regular" color="danger" role="alert">{error}</Typography>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-q-400 border border-q-border-subtle bg-q-background-secondary p-4">
                <Typography as="p" variant="caption-sm-medium" color="secondary">Total credits</Typography>
                <Typography as="p" variant="title-lg-semi-bold" color="primary" className="tabular-nums">{formatNumber(totals.credits)}</Typography>
              </div>
              <div className="rounded-q-400 border border-q-border-subtle bg-q-background-secondary p-4">
                <Typography as="p" variant="caption-sm-medium" color="secondary">Billable events</Typography>
                <Typography as="p" variant="title-lg-semi-bold" color="primary" className="tabular-nums">{formatNumber(totals.events, 0)}</Typography>
              </div>
              <div className="rounded-q-400 border border-q-border-subtle bg-q-background-secondary p-4">
                <Typography as="p" variant="caption-sm-medium" color="secondary">Groups</Typography>
                <Typography as="p" variant="title-lg-semi-bold" color="primary" className="tabular-nums">{summary.length}</Typography>
              </div>
            </div>

            <section className="flex flex-col gap-2">
              <Typography as="h2" variant="title-sm-semi-bold" color="primary">By provider, model and stage</Typography>
              <div className="overflow-x-auto rounded-q-400 border border-q-border-subtle">
                <table className="w-full min-w-[720px] border-collapse text-left text-q-caption-sm-regular">
                  <thead className="bg-q-background-secondary text-q-caption-sm-medium text-q-text-secondary">
                    <tr>
                      {["Provider", "Model", "Stage", "Events", "Units", "Credits"].map((header) => (
                        <th key={header} className="whitespace-nowrap px-3 py-2">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-q-text-tertiary">No usage recorded yet.</td></tr>
                    ) : (
                      summary.map((row) => (
                        <tr key={`${row.provider}-${row.model}-${row.stage}`} className="border-t border-q-border-subtle">
                          <td className="px-3 py-2">{row.provider}</td>
                          <td className="px-3 py-2 font-mono">{row.model}</td>
                          <td className="px-3 py-2">{row.stage}</td>
                          <td className="px-3 py-2 tabular-nums">{formatNumber(row.events, 0)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatNumber(row.units)}</td>
                          <td className="px-3 py-2 tabular-nums">{formatNumber(row.credits)}</td>
                        </tr>
                      ))
                    )}
                    {summary.length > 0 ? (
                      <tr className="border-t border-q-border-strong bg-q-background-secondary text-q-caption-sm-medium">
                        <td className="px-3 py-2" colSpan={3}>Total</td>
                        <td className="px-3 py-2 tabular-nums">{formatNumber(totals.events, 0)}</td>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2 tabular-nums">{formatNumber(totals.credits)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <Typography as="h2" variant="title-sm-semi-bold" color="primary">Recent events</Typography>
              <div className="overflow-x-auto rounded-q-400 border border-q-border-subtle">
                <table className="w-full min-w-[820px] border-collapse text-left text-q-caption-sm-regular">
                  <thead className="bg-q-background-secondary text-q-caption-sm-medium text-q-text-secondary">
                    <tr>
                      {["Time", "Entry", "Provider", "Model", "Stage", "Units", "Credits"].map((header) => (
                        <th key={header} className="whitespace-nowrap px-3 py-2">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-q-text-tertiary">No events yet.</td></tr>
                    ) : (
                      events.map((event) => (
                        <tr key={event.id} className="border-t border-q-border-subtle">
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatDate(event.created_at)}</td>
                          <td className="px-3 py-2 font-mono">{event.entry_id ? event.entry_id.slice(0, 8) : "—"}</td>
                          <td className="px-3 py-2">{event.provider}</td>
                          <td className="px-3 py-2 font-mono">{event.model}</td>
                          <td className="px-3 py-2">{event.stage}</td>
                          <td className="px-3 py-2 tabular-nums">{formatNumber(event.units)} {event.unit_type}</td>
                          <td className="px-3 py-2 tabular-nums">{formatNumber(event.credits)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
