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
    body: "Chatbots, landing pages, Zapier, lucky-draw backends — anything that speaks HTTP pushes leads straight in. Deduped, attributed, logged.",
  },
  {
    icon: Sparkles,
    title: "AI lead scoring",
    body: "Every contact gets a live 0–100 score with a plain-English explanation, so the team always knows who to call first.",
  },
  {
    icon: Workflow,
    title: "Automations",
    body: "When a lead arrives, rules fire: tag it, open a deal, create a follow-up task, or ping another tool via webhook. No code.",
  },
  {
    icon: Kanban,
    title: "Pipeline that moves",
    body: "A drag-and-drop deal board with per-stage totals — the whole agency's revenue picture at a glance.",
  },
  {
    icon: Upload,
    title: "Sheet-to-CRM in minutes",
    body: "Upload any campaign tracking sheet as CSV, map columns visually, and re-import without ever creating duplicates.",
  },
  {
    icon: Gauge,
    title: "Campaign funnels",
    body: "Leads → qualified → customers per campaign, with conversion rates and won value. Full-funnel tracking, day one to close.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.28),transparent_60%)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-600">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">Hoopla CRM</span>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
        >
          Open dashboard
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-6">
        <section className="py-20 text-center">
          <div className="animate-fade-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
            AI-native · API-first · built for agencies
          </div>
          <h1 className="animate-fade-up mx-auto max-w-3xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl" style={{ animationDelay: "80ms" }}>
            Every lead. Every deal.{" "}
            <span className="gradient-text">One source of truth.</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-slate-400" style={{ animationDelay: "160ms" }}>
            Hoopla CRM replaces the maze of tracking sheets with a single system your whole
            stack pushes into — then layers AI scoring, insights and automations on top.
          </p>
          <div className="animate-fade-up mt-9 flex justify-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href="/dashboard" className="btn-primary !px-6 !py-3 !text-base">
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-base font-medium text-white transition hover:bg-white/10"
            >
              Connect a tool
            </Link>
          </div>

          <div className="animate-fade-up mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 text-left shadow-2xl shadow-brand-950/50" style={{ animationDelay: "320ms" }}>
            <div className="flex items-center gap-1.5 border-b border-white/5 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-3 text-xs text-slate-500">any tool → Hoopla CRM</span>
            </div>
            <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed text-slate-300">
{`curl -X POST https://crm.hoopla.agency/api/v1/ingest \\
  -H "Authorization: Bearer hoopla_xxx" \\
  -d '{ "name": "Asha Patel", "email": "asha@x.com",
        "campaign": "Pexalon", "source": "chatbot" }'

→ { "processed": 1, "score": 62, "automations": "fired" }`}
            </pre>
          </div>
        </section>

        <section className="grid gap-5 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-up rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-brand-500/40 hover:bg-white/[0.06]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/20 to-fuchsia-500/20 text-brand-300">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-white/5 py-8 text-center text-xs text-slate-600">
        Hoopla CRM — the agency operating system. No more sheets.
      </footer>
    </div>
  );
}
