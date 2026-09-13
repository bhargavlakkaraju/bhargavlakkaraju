import { cloudStorageEnabled } from "../cloud-store";
import { env } from "../env";
import { LocalFileRepository } from "./local";
import type { EntryRepository } from "./repository";
import { SupabaseRepository } from "./supabase";

let repo: EntryRepository | null = null;

/** Supabase when configured, otherwise a local JSON file (dev only). */
export function getRepository(): EntryRepository {
  if (repo) return repo;
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    repo = new SupabaseRepository(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );
  } else {
    if (process.env.VERCEL && !cloudStorageEnabled())
      throw new Error("Cloud storage is not configured.");
    if (!cloudStorageEnabled())
      console.warn(
        "[portraitvoice] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set – using local JSON store at",
        env.LOCAL_DB_PATH,
      );
    repo = new LocalFileRepository(env.LOCAL_DB_PATH);
  }
  return repo;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export { summarizeUsage } from "./repository";
export type { EntryRepository, UsageSummaryRow } from "./repository";
