import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
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
        title="Campaigns"
        description="Track every campaign's funnel — from first touch to conversion — instead of a shared sheet."
        action={<CampaignFormModal />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => {
          const customers = c.contacts.filter((x) => x.status === "CUSTOMER").length;
          const qualified = c.contacts.filter((x) => x.status === "QUALIFIED").length;
          const won = c.deals.filter((d) => d.stage === "WON").reduce((s, d) => s + d.value, 0);
          const conversion = c._count.contacts ? Math.round((customers / c._count.contacts) * 100) : 0;
          return (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-slate-500">{c.client ?? "No client set"}</p>
                </div>
                <span className={`badge ${statusStyle[c.status] ?? "bg-slate-100 text-slate-600"}`}>{c.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 py-2">
                  <div className="text-lg font-bold">{c._count.contacts}</div>
                  <div className="text-[11px] text-slate-500">Leads</div>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <div className="text-lg font-bold">{qualified}</div>
                  <div className="text-[11px] text-slate-500">Qualified</div>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <div className="text-lg font-bold">{customers}</div>
                  <div className="text-[11px] text-slate-500">Customers</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Conversion <span className="font-semibold text-slate-700">{conversion}%</span>
                </span>
                <span>
                  Won <span className="font-semibold text-slate-700">{won ? formatMoney(won) : "—"}</span>
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <Link href={`/contacts?campaign=${c.id}`} className="text-xs font-medium text-brand-600 hover:underline">
                  View leads
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
            No campaigns yet. Campaigns are auto-created when tools push leads with a campaign name.
          </div>
        )}
      </div>
    </div>
  );
}
