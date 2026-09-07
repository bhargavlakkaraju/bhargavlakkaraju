# Hoopla CRM

One source of truth for the agency's contacts, deals and campaign funnels — replacing the scattered
Excel / Google Sheets tracking. Built so **any external tool can push data in** through a simple,
key-authenticated HTTP API.

## What's inside

- **Contacts** — every lead, with status lifecycle (`NEW → CONTACTED → QUALIFIED → CUSTOMER / LOST`),
  source tracking, tags, and arbitrary custom fields pushed by tools.
- **Companies** — client and prospect organisations, with per-company pipeline value.
- **Deals** — a drag-and-drop kanban pipeline (`Lead In → Qualified → Proposal → Negotiation → Won / Lost`).
- **Campaigns** — per-campaign funnel view (leads → qualified → customers, conversion %, won value).
- **Activity timeline** — notes, calls, emails, meetings and tasks (with due dates) on every contact.
- **Sheet import** — upload a CSV exported from Google Sheets/Excel, map columns visually, and import.
  Rows are matched by email/phone so re-imports update instead of duplicating.
- **Open ingest API** — create an API key per tool; anything that can send HTTP can push leads in.
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
  -d '{"name":"Asha Patel","email":"asha@example.com","campaign":"Pexalon","source":"chatbot","customData":{"crop":"cotton"}}'
```

- Single object or `{"contacts":[...]}` batch (up to 500).
- `company` / `campaign` are auto-created by name.
- Optional `note` (logged to the timeline) and `deal` (`{"title","value","stage"}`) in the same call.
- Read data back: `GET /api/v1/contacts?campaign=Pexalon&status=NEW` with the same key.

Works out of the box with Zapier/Make ("Webhooks → POST"), Google Apps Script triggers on form
submissions, or any custom backend (chatbot, lucky-draw system, landing pages).

## Stack

Next.js 14 (App Router) · Prisma + SQLite (swap the datasource to Postgres for production) ·
Tailwind CSS · Recharts.
