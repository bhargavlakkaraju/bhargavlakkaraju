# Deploying Hoopla CRM to Vercel

The app is a standard Next.js 14 project and deploys to Vercel with no special config.
The only production concern is the database: local dev uses SQLite (`file:./dev.db`),
but Vercel's serverless filesystem is ephemeral, so production needs a hosted Postgres
(Neon, Supabase, or Vercel Postgres — all have free tiers).

## 1. Database

Create a Postgres database and copy its connection string, then switch the Prisma
datasource provider (one line in `prisma/schema.prisma`):

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

## 2. Vercel

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new) (framework is auto-detected).
2. Add environment variables:
   - `DATABASE_URL` — the Postgres connection string
   - `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` — optional; enables LLM-powered insights
     (works without them via the built-in rules engine)
3. Deploy. The build script already runs `prisma generate`.

## 3. Initialise the schema (once)

From your machine, pointing at the production database:

```bash
DATABASE_URL="postgres://…" npx prisma db push
# optional demo data:
DATABASE_URL="postgres://…" npm run db:seed
```

That's it — the dashboard lives at `/dashboard` and the ingest API at `/api/v1/ingest`
(create keys under Settings → API & Integrations).
