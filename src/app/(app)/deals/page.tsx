import { prisma } from "@/lib/db";
import { fullName } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { DealBoard, type BoardDeal } from "@/components/deals/DealBoard";
import { DealFormModal } from "@/components/deals/DealFormModal";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const [deals, contacts, companies, campaigns] = await Promise.all([
    prisma.deal.findMany({
      include: { contact: true, company: true, campaign: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({ orderBy: { firstName: "asc" }, take: 500 }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.campaign.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const boardDeals: BoardDeal[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    value: d.value,
    currency: d.currency,
    stage: d.stage,
    contactName: d.contact ? fullName(d.contact) : null,
    contactId: d.contactId,
    companyName: d.company?.name ?? null,
    campaignName: d.campaign?.name ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="New-business pipeline"
        description="Every pitch to a prospective client — drag cards between stages as conversations progress."
        action={
          <DealFormModal
            contacts={contacts.map((c) => ({ id: c.id, name: fullName(c) }))}
            companies={companies}
            campaigns={campaigns}
          />
        }
      />
      <DealBoard deals={boardDeals} />
    </div>
  );
}
