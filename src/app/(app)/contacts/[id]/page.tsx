import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Megaphone,
  Tag,
  Pencil,
  StickyNote,
  PhoneCall,
  CalendarClock,
  ListTodo,
  Bot,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMoney, fullName, STATUS_COLORS, STAGE_LABELS } from "@/lib/utils";
import { ContactFormModal } from "@/components/contacts/ContactFormModal";
import { ActivityComposer } from "@/components/contacts/ActivityComposer";
import { DeleteButton, TaskToggle } from "@/components/contacts/RowActions";
import { AiInsightsPanel } from "@/components/contacts/AiInsightsPanel";
import { ScoreBadge } from "@/components/contacts/ScoreBadge";

export const dynamic = "force-dynamic";

const activityIcons: Record<string, React.ReactNode> = {
  NOTE: <StickyNote className="h-4 w-4 text-amber-500" />,
  CALL: <PhoneCall className="h-4 w-4 text-sky-500" />,
  EMAIL: <Mail className="h-4 w-4 text-violet-500" />,
  MEETING: <CalendarClock className="h-4 w-4 text-emerald-500" />,
  TASK: <ListTodo className="h-4 w-4 text-orange-500" />,
  SYSTEM: <Bot className="h-4 w-4 text-slate-400" />,
};

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const [contact, companies, campaigns] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        campaign: true,
        deals: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.campaign.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!contact) notFound();

  const customData = contact.customData ? (JSON.parse(contact.customData) as Record<string, unknown>) : null;

  return (
    <div>
      <Link href="/contacts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> All contacts
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{fullName(contact)}</h1>
            <span className={`badge ${STATUS_COLORS[contact.status] ?? "bg-slate-100 text-slate-600"}`}>
              {contact.status}
            </span>
            <ScoreBadge score={contact.score} reason={contact.scoreReason} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {contact.title ?? "No title"} · added {format(contact.createdAt, "d MMM yyyy")} via{" "}
            <span className="font-medium">{contact.source}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <ContactFormModal
            companies={companies}
            campaigns={campaigns}
            contact={contact}
            trigger={
              <button className="btn-secondary">
                <Pencil className="h-4 w-4" /> Edit
              </button>
            }
          />
          <DeleteButton url={`/api/contacts/${contact.id}`} redirectTo="/contacts" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Details</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{contact.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{contact.phone ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>{contact.company?.name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Megaphone className="h-4 w-4 text-slate-400" />
                <span>{contact.campaign?.name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Tag className="h-4 w-4 text-slate-400" />
                <span>
                  {contact.tags
                    ? contact.tags.split(",").map((t) => (
                        <span key={t} className="badge mr-1 bg-slate-100 text-slate-600">
                          {t.trim()}
                        </span>
                      ))
                    : "—"}
                </span>
              </div>
            </dl>
          </div>

          {customData && Object.keys(customData).length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Data from tools</h2>
              <dl className="space-y-1.5 text-sm">
                {Object.entries(customData).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Deals</h2>
            <ul className="space-y-2">
              {contact.deals.map((d) => (
                <li key={d.id} className="rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.title}</span>
                    <span className="text-slate-600">{formatMoney(d.value, d.currency)}</span>
                  </div>
                  <div className="text-xs text-slate-500">{STAGE_LABELS[d.stage] ?? d.stage}</div>
                </li>
              ))}
              {!contact.deals.length && <li className="text-sm text-slate-400">No deals yet</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <AiInsightsPanel contactId={contact.id} cachedSummary={contact.aiSummary} />
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Activity</h2>
            <ActivityComposer contactId={contact.id} />
            <ul className="mt-5 space-y-3">
              {contact.activities.map((a) => (
                <li key={a.id} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="mt-0.5">{activityIcons[a.type] ?? activityIcons.NOTE}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {a.type}
                        {a.dueAt && ` · due ${format(a.dueAt, "d MMM, HH:mm")}`}
                      </span>
                      <span className="text-xs text-slate-400">{format(a.createdAt, "d MMM yyyy, HH:mm")}</span>
                    </div>
                    <p className={`mt-1 whitespace-pre-wrap text-sm ${a.completed ? "text-slate-400 line-through" : ""}`}>
                      {a.content}
                    </p>
                  </div>
                  {a.type === "TASK" && <TaskToggle id={a.id} completed={a.completed} />}
                </li>
              ))}
              {!contact.activities.length && (
                <li className="py-6 text-center text-sm text-slate-400">No activity logged yet</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
