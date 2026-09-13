import type {
  AiUsageEvent,
  EntryPatch,
  NewEntry,
  NewUsageEvent,
  TestimonialEntry,
} from "../types";

export interface UsageSummaryRow {
  provider: string;
  model: string;
  stage: string;
  events: number;
  units: number;
  unit_type: string;
  credits: number;
}

export interface EntryRepository {
  createEntry(entry: NewEntry): Promise<TestimonialEntry>;
  getEntry(id: string): Promise<TestimonialEntry | null>;
  updateEntry(id: string, patch: EntryPatch): Promise<TestimonialEntry>;
  listEntries(limit?: number, offset?: number): Promise<TestimonialEntry[]>;
  listCompletedEntries(
    limit?: number,
    offset?: number,
  ): Promise<TestimonialEntry[]>;
  insertUsage(event: NewUsageEvent): Promise<AiUsageEvent>;
  listUsage(limit?: number, offset?: number): Promise<AiUsageEvent[]>;
}

export function summarizeUsage(
  events: readonly AiUsageEvent[],
): UsageSummaryRow[] {
  const map = new Map<string, UsageSummaryRow>();
  for (const e of events) {
    const key = `${e.provider}|${e.model}|${e.stage}`;
    const row = map.get(key) ?? {
      provider: e.provider,
      model: e.model,
      stage: e.stage,
      events: 0,
      units: 0,
      unit_type: e.unit_type,
      credits: 0,
    };
    row.events += 1;
    row.units += Number(e.units);
    row.credits += Number(e.credits);
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.credits - a.credits);
}
