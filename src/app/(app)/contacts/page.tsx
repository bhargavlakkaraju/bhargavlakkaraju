import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { fullName, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContactFormModal } from "@/components/contacts/ContactFormModal";
import { ContactsToolbar } from "@/components/contacts/ContactsToolbar";
import { ScoreBadge } from "@/components/contacts/ScoreBadge";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; campaign?: string };
}) {
  const q = searchParams.q?.trim();
  const [contacts, companies, campaigns] = await Promise.all([
    prisma.contact.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { email: { contains: q } },
                { phone: { contains: q } },
              ],
            }
          : {}),
        ...(searchParams.status ? { status: searchParams.status } : {}),
        ...(searchParams.campaign ? { campaignId: searchParams.campaign } : {}),
      },
      include: { company: true, campaign: true },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.campaign.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Prospects"
        description={`${contacts.length} shown — every potential client from every list, tool and referral, hottest first.`}
        action={<ContactFormModal companies={companies} campaigns={campaigns} />}
      />
      <ContactsToolbar campaigns={campaigns} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">AI score</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-3">
                  <ScoreBadge score={c.score} reason={c.scoreReason} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/contacts/${c.id}`} className="font-medium text-slate-900 hover:text-brand-600">
                    {fullName(c)}
                  </Link>
                  {c.title && <div className="text-xs text-slate-500">{c.title}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{c.email ?? "—"}</div>
                  {c.phone && <div className="text-xs text-slate-500">{c.phone}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.company?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.campaign?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-slate-100 text-slate-600">{c.source}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{format(c.createdAt, "d MMM yyyy")}</td>
              </tr>
            ))}
            {!contacts.length && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-sm text-slate-400">
                  No prospects found. Add one manually, import a list, or push data via the API.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
