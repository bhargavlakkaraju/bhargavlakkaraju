import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney, OUTREACHED_STATUSES, REPLIED_STATUSES } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { CampaignFormModal } from "@/components/campaigns/CampaignFormModal";
import { DeleteButton } from "@/components/contacts/RowActions";

export const dynamic = "force-dynamic";

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-slate-100 text-slate-500",
};

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      _count: { select: { contacts: true, deals: true } },
      contacts: { select: { status: true } },
      deals: { select: { value: true, stage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Outreach campaigns"
        description="Every outreach push — cold email, LinkedIn, referrals — with its funnel from first touch to signed client."
        action={<CampaignFormModal />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => {
          const outreached = c.contacts.filter((x) => OUTREACHED_STATUSES.includes(x.status)).length;
          const replied = c.contacts.filter((x) => REPLIED_STATUSES.includes(x.status)).length;
          const clients = c.contacts.filter((x) => x.status === "CLIENT").length;
          const won = c.deals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.value, 0);
          const replyRate = outreached ? Math.round((replied / outreached) * 100) : 0;
          return (
            <div key={c.id} className="card card-hover p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-slate-500">{c.client ?? "No target segment set"}</p>
                </div>
                <span className={`badge ${statusStyle[c.status] ?? "bg-slate-100 text-slate-600"}`}>{c.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 py-2">
                  <div className="text-lg font-bold">{c._count.contacts}</div>
                  <div className="text-[11px] text-slate-500">Prospects</div>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <div className="text-lg font-bold">{outreached}</div>
                  <div className="text-[11px] text-slate-500">Contacted</div>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <div className="text-lg font-bold">{replied}</div>
                  <div className="text-[11px] text-slate-500">Replied</div>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <div className="text-lg font-bold">{clients}</div>
                  <div className="text-[11px] text-slate-500">Clients</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Reply rate <span className="font-semibold text-slate-700">{replyRate}%</span>
                </span>
                <span>
                  Won <span className="font-semibold text-slate-700">{won ? formatMoney(won) : "—"}</span>
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <Link href={`/contacts?campaign=${c.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                  View prospects
                </Link>
                <div className="flex items-center gap-1">
                  <CampaignFormModal campaign={c} />
                  <DeleteButton url={`/api/campaigns/${c.id}`} label="" />
                </div>
              </div>
            </div>
          );
        })}
        {!campaigns.length && (
          <div className="card col-span-full py-16 text-center text-sm text-slate-400">
            No outreach campaigns yet. They&apos;re auto-created when tools push prospects with a campaign name.
          </div>
        )}
      </div>
    </div>
  );
}
