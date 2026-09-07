# Hoopla CRM

The agency's **new-business outreach engine** — one source of truth for every prospective client,
pitch and outreach campaign, replacing scattered tracking sheets. Built so **any lead-gen tool can
push prospects in** through a simple, key-authenticated HTTP API, with an **AI layer** (prospect
scoring, outreach copilot, automations) on top.

## Outreach lifecycle

`Prospect → Contacted → Replied → Meeting booked → Client` (or `Not interested`), with reply-rate
funnels per outreach campaign and a pipeline for pitches
(`Opportunity → Discovery call → Proposal sent → Negotiation → Won / Lost`).

## AI & automations

- **AI prospect scoring** — every prospect carries a live 0–100 score (replies and booked meetings
  weigh heaviest; quiet threads decay) with a plain-English explanation, recomputed on every
  ingest/edit. Prospects sort hottest-first.
- **AI outreach copilot on each prospect** — one click generates a funnel-stage summary, next
  outreach moves, and a personalised cold/follow-up email draft pitching Hoopla's services.
- **Today's briefing** on the dashboard — who to work first, threads waiting on a reply (with
  follow-up nudges), meetings booked, automation activity, and the overall reply rate.
- **Automations** — no-code rules: *when a prospect arrives / changes stage* and *conditions match*
  (campaign, source, stage, min score) *then* set stage, add a tag, create a task, open a pitch, or
  **POST a webhook to another tool** (outbound integration). Every run is logged.
- AI features use any **OpenAI-compatible provider** via `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL`.
  Without a key, a deterministic rules engine powers the same features, so nothing breaks.

## What's inside

- **Prospects** — every potential client, with outreach stage, source tracking, tags, and arbitrary
  custom fields pushed by tools (industry, headcount, ad spend…).
- **Companies** — target organisations, with per-company pipeline value.
- **Pipeline** — a drag-and-drop kanban board for pitches.
- **Outreach campaigns** — per-channel funnel view (prospects → contacted → replied → clients),
  reply rate and won value.
- **Activity timeline** — notes, calls, emails, LinkedIn touches, meetings and tasks (with due
  dates) on every prospect.
- **List import** — upload any prospect list as CSV (sheet exports, Apollo/Lusha exports), map
  columns visually, and import. Rows are matched by email/phone so re-imports update instead of
  duplicating.
- **Open ingest API** — create an API key per tool; anything that can send HTTP can push prospects in.
- **Incoming data log** — every payload from every tool is recorded for easy integration debugging.

## Getting started

```bash
npm install
cp .env.example .env        # uses a local SQLite file, no DB server needed
npx prisma db push          # create the database
npm run db:seed             # (optional) demo data
npm run dev                 # http://localhost:3000
```

## Pushing data from other tools

Create a key in **API & Integrations**, then:

```bash
curl -X POST http://localhost:3000/api/v1/ingest \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rohan Mehta","email":"rohan@urbankart.example","title":"Founder","company":"UrbanKart","campaign":"Cold email — D2C founders Q4","source":"apollo"}'
```

- Single object or `{"contacts":[...]}` batch (up to 500).
- `company` / `campaign` are auto-created by name.
- Optional `note` (logged to the timeline) and `deal` (`{"title","value","stage"}`) in the same call.
- Read data back: `GET /api/v1/contacts?status=REPLIED` with the same key — useful for sequencing
  tools that need to stop emailing people who answered.

Works out of the box with Apollo/Clay exports via Zapier or Make ("Webhooks → POST"), LinkedIn
scrapers, Google Apps Script triggers on form submissions, or any custom backend.

## Stack

Next.js 14 (App Router) · Prisma + SQLite (swap the datasource to Postgres for production) ·
Tailwind CSS · Recharts.
