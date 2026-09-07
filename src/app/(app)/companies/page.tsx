import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { CompanyFormModal } from "@/components/companies/CompanyFormModal";
import { DeleteButton } from "@/components/contacts/RowActions";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    include: {
      _count: { select: { contacts: true, deals: true } },
      deals: { where: { stage: { notIn: ["WON", "LOST"] } }, select: { value: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Clients and prospect organisations."
        action={<CompanyFormModal />}
      />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Contacts</th>
              <th className="px-4 py-3 font-medium">Open pipeline</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => (
              <tr key={c.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  {c.domain && <div className="text-xs text-slate-500">{c.domain}</div>}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.industry ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.location ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c._count.contacts}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.deals.length ? formatMoney(c.deals.reduce((s, d) => s + d.value, 0)) : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{format(c.createdAt, "d MMM yyyy")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <CompanyFormModal company={c} />
                    <DeleteButton url={`/api/companies/${c.id}`} label="" />
                  </div>
                </td>
              </tr>
            ))}
            {!companies.length && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
