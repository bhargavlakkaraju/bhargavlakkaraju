// Applies db/migrations/*.sql in order against DATABASE_URL (Neon / Vercel Postgres).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL (or POSTGRES_URL) before running migrations.");
  process.exit(1);
}
const sql = neon(url);
const dir = join(process.cwd(), "db", "migrations");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const text = readFileSync(join(dir, file), "utf8");
  // Split on blank-line-separated statements; the function body uses $$ so keep it whole.
  const statements = text
    .split(/;\s*\n(?=\s*(?:--|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|WITH|SET|GRANT|REVOKE|BEGIN|COMMENT)\b)/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const statement of statements) {
    await sql.query(statement.endsWith(";") ? statement : `${statement};`);
  }
  console.log(`applied ${file} (${statements.length} statements)`);
}
