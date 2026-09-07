import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Sparkles,
  Plug,
  Kanban,
  Upload,
  Gauge,
  Workflow,
} from "lucide-react";

const features = [
  {
    icon: Plug,
    title: "Open ingest API",
    body: "Apollo, Clay, LinkedIn scrapers, website forms, Zapier — anything that speaks HTTP pushes prospects straight in. Deduped, attributed, logged.",
  },
  {
    icon: Sparkles,
    title: "AI prospect scoring",
    body: "Every prospect gets a live 0–100 score with a plain-English explanation, so you always know who to work first.",
  },
  {
    icon: Workflow,
    title: "Outreach automations",
    body: "A prospect replies? Rules fire: tag them, open a pitch, create a book-the-call task, or ping your other tools via webhook. No code.",
  },
  {
    icon: Kanban,
    title: "New-business pipeline",
    body: "Opportunity → discovery → proposal → won, on a drag-and-drop board with per-stage totals. The agency's growth picture at a glance.",
  },
  {
    icon: Upload,
    title: "List-to-CRM in minutes",
    body: "Upload any prospect list as CSV, map columns visually, and re-import without ever creating duplicates.",
  },
  {
    icon: Gauge,
    title: "Reply-rate funnels",
    body: "Contacted → replied → meeting → client per outreach campaign, with reply rates and won value. Know which channel actually lands clients.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold">Hoopla CRM</span>
          </div>
          <Link href="/dashboard" className="btn-primary !py-1.5">
            Open dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="border-x border-slate-200 px-6 pb-16 pt-20 text-center sm:px-12">
          <div className="animate-fade-up mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1 text-xs font-medium text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" />
            AI-native · API-first · built for winning new clients
          </div>
          <h1
            className="animate-fade-up mx-auto max-w-3xl text-5xl font-semibold leading-[1.1] tracking-tight sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Every prospect. Every pitch.
            <br />
            <span className="text-brand-600">One outreach engine.</span>
          </h1>
          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500"
            style={{ animationDelay: "120ms" }}
          >
            Hoopla CRM turns scattered prospect sheets into a single new-business system — every
            lead-gen tool pushes in, AI scores who to work first, and automations keep every thread
            moving until the deal is won.
          </p>
          <div className="animate-fade-up mt-9 flex justify-center gap-3" style={{ animationDelay: "180ms" }}>
            <Link href="/dashboard" className="btn-primary !px-5 !py-2.5">
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/settings" className="btn-secondary !px-5 !py-2.5">
              Connect a tool
            </Link>
          </div>

          <div
            className="animate-fade-up mx-auto mt-16 max-w-3xl overflow-hidden rounded-lg border border-slate-200 text-left"
            style={{ animationDelay: "240ms" }}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <span className="text-xs font-medium text-slate-500">any tool → Hoopla CRM</span>
              <span className="font-mono text-[11px] text-slate-400">POST /api/v1/ingest</span>
            </div>
            <pre className="overflow-x-auto bg-slate-950 p-5 text-[13px] leading-relaxed text-slate-300">
{`curl -X POST https://crm.hoopla.agency/api/v1/ingest \\
  -H "Authorization: Bearer hoopla_xxx" \\
  -d '{ "name": "Rohan Mehta", "title": "Founder",
        "company": "UrbanKart", "source": "apollo",
        "campaign": "Cold email — D2C founders Q4" }'

→ { "processed": 1, "score": 58, "automations": "fired" }`}
            </pre>
          </div>
        </section>

        <section className="grid gap-px border-x border-t border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group bg-white p-7 transition-colors hover:bg-slate-50">
              <f.icon className="mb-4 h-5 w-5 text-slate-400 transition-colors group-hover:text-brand-600" />
              <h3 className="mb-1.5 text-sm font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        Hoopla CRM — the agency&apos;s new-business engine. No more sheets.
      </footer>
    </div>
  );
}
