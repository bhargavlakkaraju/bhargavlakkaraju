import Link from "next/link";
import { format, startOfDay, subDays } from "date-fns";
import { Users, Reply, IndianRupee, Trophy, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  formatMoney,
  fullName,
  STATUS_COLORS,
  STATUS_LABELS,
  OUTREACHED_STATUSES,
  REPLIED_STATUSES,
} from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadsByCampaignChart, LeadsOverTimeChart } from "@/components/dashboard/Charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const weekAgo = subDays(new Date(), 7);
  const twoWeeksAgo = startOfDay(subDays(new Date(), 13));

  const [
    totalContacts,
    newThisWeek,
    outreachedCount,
    repliedCount,
    openDeals,
    wonDeals,
    campaigns,
    recentContacts,
    recentEvents,
    recentForChart,
    hotLeads,
    waitingOnReply,
    needsFollowUp,
    meetingsBooked,
    automationRunsToday,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.contact.count({ where: { status: { in: OUTREACHED_STATUSES } } }),
    prisma.contact.count({ where: { status: { in: REPLIED_STATUSES } } }),
    prisma.deal.findMany({ where: { stage: { notIn: ["WON", "LOST"] } } }),
    prisma.deal.findMany({ where: { stage: "WON" } }),
    prisma.campaign.findMany({
      include: { _count: { select: { contacts: true } } },
      orderBy: { contacts: { _count: "desc" } },
      take: 8,
    }),
    prisma.contact.findMany({
      include: { company: true, campaign: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.ingestEvent.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.contact.findMany({
      where: { createdAt: { gte: twoWeeksAgo } },
      select: { createdAt: true },
    }),
    prisma.contact.findMany({
      where: { status: { notIn: ["CLIENT", "NOT_INTERESTED"] }, score: { gte: 50 } },
      orderBy: { score: "desc" },
      take: 3,
    }),
    prisma.contact.count({ where: { status: "CONTACTED" } }),
    prisma.contact.count({
      where: { status: "CONTACTED", updatedAt: { lt: subDays(new Date(), 3) } },
    }),
    prisma.contact.count({ where: { status: "MEETING_BOOKED" } }),
    prisma.automationRun.count({ where: { createdAt: { gte: startOfDay(new Date()) } } }),
  ]);

  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const replyRate = outreachedCount ? Math.round((repliedCount / outreachedCount) * 100) : 0;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = startOfDay(subDays(new Date(), 13 - i));
    return {
      day: format(d, "d MMM"),
      leads: recentForChart.filter((c) => startOfDay(c.createdAt).getTime() === d.getTime()).length,
    };
  });

  const byCampaign = campaigns.map((c) => ({ name: c.name, leads: c._count.contacts }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Hoopla's new-business outreach, in one place — no more scattered sheets."
      />

      <div className="card mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-950 via-brand-950 to-slate-950 p-5 text-white">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-brand-400" /> Today&apos;s briefing
            <span className="ai-chip">AI</span>
          </div>
          <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Work these first</div>
              {hotLeads.length ? (
                <ul className="mt-1 space-y-0.5">
                  {hotLeads.map((l) => (
                    <li key={l.id}>
                      <Link href={`/contacts/${l.id}`} className="font-medium text-brand-300 hover:underline">
                        {fullName(l)}
                      </Link>{" "}
                      <span className="text-slate-400">· score {l.score}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-slate-400">No hot prospects right now.</p>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Waiting on reply</div>
              <p className="mt-1 text-2xl font-bold">{waitingOnReply}</p>
              <p className="text-xs text-slate-400">
                {needsFollowUp ? `${needsFollowUp} quiet for 3+ days — follow up` : "all threads are fresh"}
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Meetings booked</div>
              <p className="mt-1 text-2xl font-bold">{meetingsBooked}</p>
              <p className="text-xs text-slate-400">{meetingsBooked ? "prep before the call" : "push for the next one"}</p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Automations today</div>
              <p className="mt-1 text-2xl font-bold">{automationRunsToday}</p>
              <Link href="/automations" className="text-xs text-brand-300 hover:underline">
                view run history →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prospects"
          value={String(totalContacts)}
          sub={`${newThisWeek} added this week`}
          icon={Users}
        />
        <StatCard
          label="Reply rate"
          value={`${replyRate}%`}
          sub={`${repliedCount} of ${outreachedCount} outreached`}
          icon={Reply}
          tone="sky"
        />
        <StatCard
          label="Open pipeline"
          value={formatMoney(pipelineValue)}
          sub={`${openDeals.length} open pitches`}
          icon={IndianRupee}
          tone="amber"
        />
        <StatCard
          label="Won"
          value={formatMoney(wonValue)}
          sub={`${wonDeals.length} new clients closed`}
          icon={Trophy}
          tone="emerald"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Prospects by outreach campaign</h2>
          {byCampaign.length ? (
            <LeadsByCampaignChart data={byCampaign} />
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">No outreach campaigns yet</p>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">New prospects — last 14 days</h2>
          <LeadsOverTimeChart data={days} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Latest prospects</h2>
            <Link href="/contacts" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentContacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link href={`/contacts/${c.id}`} className="text-sm font-medium hover:text-brand-600">
                    {fullName(c)}
                  </Link>
                  <div className="truncate text-xs text-slate-500">
                    {[c.company?.name, c.campaign?.name, c.source].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className={`badge ${STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </li>
            ))}
            {!recentContacts.length && (
              <li className="py-8 text-center text-sm text-slate-400">
                No prospects yet — import a list or connect a lead-gen tool.
              </li>
            )}
          </ul>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Incoming data feed</h2>
            <Link href="/settings" className="text-xs font-medium text-brand-600 hover:underline">
              API settings
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentEvents.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{e.apiKeyName ?? "Unknown source"}</div>
                  <div className="truncate text-xs text-slate-500">
                    {e.endpoint} · {format(e.createdAt, "d MMM, HH:mm")}
                  </div>
                </div>
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
              </li>
            ))}
            {!recentEvents.length && (
              <li className="py-8 text-center text-sm text-slate-400">
                Nothing pushed yet. Create an API key in settings and point your tools here.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
