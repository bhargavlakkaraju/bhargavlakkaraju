# FinFlow — Agency Command Center

One dashboard to run your agency: who's working on what, what's happening across
projects, your money (invoices, payments, expenses), and your Gmail inbox — all
in one place.

## What's inside

- **Command Center** (`/dashboard`) — the single view of the business:
  - Revenue this month, outstanding & overdue invoices, active projects, open tasks
  - **Who's working on what** — every team member and their current task
  - **What's happening** — a live activity feed across tasks, projects, and payments
  - **Needs attention** — overdue invoices, blocked/overdue tasks, at-risk projects
  - **Inbox** — your latest Gmail messages, right on the dashboard
- **Projects** — every engagement with client, lead, health, progress, budget, and due date
- **Team** — per-person workload, current tasks, and what shipped this week
- **Inbox** — full Gmail panel with unread counts; click through to Gmail
- Plus the existing finance suite: invoices, payments, clients, expenses, AI workflows

## Quick start

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and NEXTAUTH_SECRET
npm run setup             # create tables + load demo agency data
npm run dev
```

Log in with the seeded account: **admin@agency.com** / **password123**

## Connect Gmail

The dashboard reads your Gmail inbox (read-only) via Google OAuth.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. Enable the **Gmail API** (APIs & Services → Library → Gmail API → Enable).
3. Configure the OAuth consent screen (External is fine for testing; add your email as a test user).
4. Create credentials: **OAuth client ID** → type **Web application**, and add this
   authorized redirect URI (adjust host for production):

   ```
   http://localhost:3000/api/gmail/callback
   ```

5. Put the client ID and secret in `.env`:

   ```
   GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="..."
   ```

6. Restart the dev server, open **Inbox** in the sidebar, and click **Connect Gmail**.

Tokens are stored per user and refreshed automatically. Disconnect anytime from the
Inbox page (this also revokes the token with Google).

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Session signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Gmail OAuth (see above) |
| `SMTP_*` | Outbound email for reminders (optional) |
| `AI_*` | AI workflow provider (optional) |

## Stack

Next.js 14 (App Router) · Prisma + PostgreSQL · NextAuth (credentials) · Tailwind CSS
