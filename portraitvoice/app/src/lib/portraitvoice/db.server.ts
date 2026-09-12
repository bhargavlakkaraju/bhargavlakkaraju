import type { D1Database } from "@cloudflare/workers-types";
import type {
  AiUsageEvent,
  EntryStatus,
  Stage,
  TestimonialEntry,
  UsageStage,
  UsageSummaryRow,
} from "./types";

/**
 * `cloudflare:workers` only exists on the deployed Worker. Loading the bindings
 * module lazily keeps local `vite dev` from crashing at import time, so the
 * routes render a calm "database unavailable" state instead of a 500.
 */
async function db(): Promise<D1Database> {
  const { bindings } = await import("@/lib/bindings.server").catch(() => ({ bindings: () => ({}) as { DB?: D1Database } }));
  const database = bindings().DB;
  if (!database) throw new Error("The database is not available in this environment yet.");
  return database;
}

const ENTRY_COLUMNS =
  "id, status, current_stage, input_mode, language, voice_id, voice_name, voice_gender, script_text, source_portrait_url, portrait_url, audio_url, motion_url, video_url, video_engine, audio_seconds, portrait_job_id, video_job_id, owner_id, error_message, completed_at, created_at, updated_at";

export type NewEntry = Pick<
  TestimonialEntry,
  | "id"
  | "input_mode"
  | "language"
  | "voice_gender"
  | "voice_name"
  | "script_text"
  | "source_portrait_url"
  | "audio_url"
  | "audio_seconds"
  | "owner_id"
>;

export async function insertEntry(entry: NewEntry): Promise<TestimonialEntry> {
  await (await db())
    .prepare(
      `INSERT INTO testimonial_entries (id, status, current_stage, input_mode, language, voice_gender, voice_name, script_text, source_portrait_url, audio_url, audio_seconds, owner_id)
       VALUES (?1, 'processing', 'portrait', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(
      entry.id,
      entry.input_mode,
      entry.language,
      entry.voice_gender,
      entry.voice_name,
      entry.script_text,
      entry.source_portrait_url,
      entry.audio_url,
      entry.audio_seconds,
      entry.owner_id,
    )
    .run();
  return getEntry(entry.id);
}

export async function getEntry(id: string): Promise<TestimonialEntry> {
  const row = await (await db())
    .prepare(`SELECT ${ENTRY_COLUMNS} FROM testimonial_entries WHERE id = ?1`)
    .bind(id)
    .first<TestimonialEntry>();
  if (!row) throw new Error("This testimonial request no longer exists.");
  return row;
}

type Patch = Partial<
  Pick<
    TestimonialEntry,
    | "status"
    | "current_stage"
    | "portrait_url"
    | "audio_url"
    | "video_url"
    | "video_engine"
    | "audio_seconds"
    | "portrait_job_id"
    | "video_job_id"
    | "error_message"
    | "completed_at"
    | "script_text"
  >
>;

export async function updateEntry(id: string, patch: Patch): Promise<TestimonialEntry> {
  const keys = Object.keys(patch) as (keyof Patch)[];
  if (keys.length === 0) return getEntry(id);
  const assignments = keys.map((key, index) => `${key} = ?${index + 2}`).join(", ");
  const values = keys.map((key) => patch[key] ?? null);
  await (await db())
    .prepare(`UPDATE testimonial_entries SET ${assignments} WHERE id = ?1`)
    .bind(id, ...values)
    .run();
  return getEntry(id);
}

export async function markStage(id: string, stage: Stage): Promise<void> {
  await updateEntry(id, { current_stage: stage, status: "processing" satisfies EntryStatus });
}

export async function markFailed(id: string, message: string): Promise<void> {
  await updateEntry(id, { status: "failed", error_message: message.slice(0, 1000) });
}

export async function listCompletedEntries(limit = 60): Promise<TestimonialEntry[]> {
  const { results } = await (await db())
    .prepare(
      `SELECT ${ENTRY_COLUMNS} FROM testimonial_entries
       WHERE status = 'completed' AND video_url IS NOT NULL
       ORDER BY completed_at DESC LIMIT ?1`,
    )
    .bind(limit)
    .all<TestimonialEntry>();
  return results;
}

export async function listAllEntries(limit = 200): Promise<TestimonialEntry[]> {
  const { results } = await (await db())
    .prepare(`SELECT ${ENTRY_COLUMNS} FROM testimonial_entries ORDER BY created_at DESC LIMIT ?1`)
    .bind(limit)
    .all<TestimonialEntry>();
  return results;
}

export async function insertUsage(event: {
  entryId: string | null;
  provider: string;
  model: string;
  stage: UsageStage;
  units: number;
  unitType: string;
  credits: number;
}): Promise<void> {
  await (await db())
    .prepare(
      `INSERT INTO ai_usage_events (id, entry_id, provider, model, stage, units, unit_type, credits)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      crypto.randomUUID(),
      event.entryId,
      event.provider,
      event.model,
      event.stage,
      event.units,
      event.unitType,
      event.credits,
    )
    .run();
}

export async function listUsageEvents(limit = 500): Promise<AiUsageEvent[]> {
  const { results } = await (await db())
    .prepare(
      `SELECT id, entry_id, provider, model, stage, units, unit_type, credits, created_at, updated_at
       FROM ai_usage_events ORDER BY created_at DESC LIMIT ?1`,
    )
    .bind(limit)
    .all<AiUsageEvent>();
  return results;
}

export async function summarizeUsage(): Promise<UsageSummaryRow[]> {
  const { results } = await (await db())
    .prepare(
      `SELECT provider, model, stage, COUNT(*) AS events, SUM(units) AS units, SUM(credits) AS credits
       FROM ai_usage_events GROUP BY provider, model, stage ORDER BY credits DESC`,
    )
    .all<UsageSummaryRow>();
  return results;
}
