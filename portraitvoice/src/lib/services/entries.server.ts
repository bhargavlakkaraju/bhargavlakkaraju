import { PipelineError, type AiUsageEvent, type TestimonialEntry, type UsageStage, type UsageSummaryRow } from "../types";
import { creditsFor, USAGE_RATES } from "../usage-rates";
import { query, queryOne } from "./db.server";

const COLUMNS =
  "id, status, current_stage, input_mode, language, voice_id, voice_name, voice_gender, script_text, source_portrait_url, portrait_url, audio_url, motion_url, video_url, audio_seconds, current_job_id, error_message, completed_at::text, created_at::text, updated_at::text";

export type NewEntry = Pick<
  TestimonialEntry,
  "input_mode" | "language" | "voice_gender" | "voice_name" | "script_text" | "source_portrait_url" | "audio_url" | "audio_seconds"
>;

export async function insertEntry(entry: NewEntry): Promise<TestimonialEntry> {
  const row = await queryOne<TestimonialEntry>(
    `INSERT INTO testimonial_entries (status, current_stage, input_mode, language, voice_gender, voice_name, script_text, source_portrait_url, audio_url, audio_seconds)
     VALUES ('processing', 'portrait', $1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${COLUMNS}`,
    [entry.input_mode, entry.language, entry.voice_gender, entry.voice_name, entry.script_text, entry.source_portrait_url, entry.audio_url, entry.audio_seconds],
  );
  if (!row) throw new PipelineError("Could not save your request. Please try again.");
  return row;
}

export async function getEntry(id: string): Promise<TestimonialEntry> {
  const row = await queryOne<TestimonialEntry>(`SELECT ${COLUMNS} FROM testimonial_entries WHERE id = $1`, [id]);
  if (!row) throw new PipelineError("This testimonial request no longer exists.");
  return row;
}

type Patch = Partial<
  Pick<
    TestimonialEntry,
    "status" | "current_stage" | "portrait_url" | "audio_url" | "video_url" | "audio_seconds" | "current_job_id" | "voice_id" | "voice_name" | "error_message" | "completed_at"
  >
>;

export async function updateEntry(id: string, patch: Patch): Promise<TestimonialEntry> {
  const keys = Object.keys(patch) as (keyof Patch)[];
  if (keys.length === 0) return getEntry(id);
  const assignments = keys.map((key, index) => `${key} = $${index + 2}`).join(", ");
  const values = keys.map((key) => patch[key] ?? null);
  const row = await queryOne<TestimonialEntry>(
    `UPDATE testimonial_entries SET ${assignments} WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, ...values],
  );
  if (!row) throw new PipelineError("Could not update your request.");
  return row;
}

export async function markFailed(id: string, message: string): Promise<void> {
  await query(`UPDATE testimonial_entries SET status = 'failed', error_message = $2 WHERE id = $1`, [id, message.slice(0, 1000)]);
}

export async function listCompletedEntries(limit = 60): Promise<TestimonialEntry[]> {
  return query<TestimonialEntry>(
    `SELECT ${COLUMNS} FROM testimonial_entries WHERE status = 'completed' AND video_url IS NOT NULL ORDER BY completed_at DESC NULLS LAST LIMIT $1`,
    [limit],
  );
}

export async function listAllEntries(limit = 200): Promise<TestimonialEntry[]> {
  return query<TestimonialEntry>(`SELECT ${COLUMNS} FROM testimonial_entries ORDER BY created_at DESC LIMIT $1`, [limit]);
}

export async function recordUsage(entryId: string | null, stage: UsageStage, units: number, model?: string): Promise<void> {
  const rate = USAGE_RATES[stage];
  try {
    await query(
      `INSERT INTO ai_usage_events (entry_id, provider, model, stage, units, unit_type, credits) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [entryId, rate.provider, model ?? rate.model, stage, units, rate.unitType, creditsFor(stage, units)],
    );
  } catch (error) {
    console.error("[usage] insert failed", error instanceof Error ? error.message : error);
  }
}

export async function listUsageEvents(limit = 300): Promise<AiUsageEvent[]> {
  const rows = await query<AiUsageEvent>(
    `SELECT id, entry_id, provider, model, stage, units::float8 AS units, unit_type, credits::float8 AS credits, created_at::text, updated_at::text
     FROM ai_usage_events ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function summarizeUsage(): Promise<UsageSummaryRow[]> {
  return query<UsageSummaryRow>(
    `SELECT provider, model, stage, COUNT(*)::int AS events, SUM(units)::float8 AS units, SUM(credits)::float8 AS credits
     FROM ai_usage_events GROUP BY provider, model, stage ORDER BY credits DESC`,
  );
}
