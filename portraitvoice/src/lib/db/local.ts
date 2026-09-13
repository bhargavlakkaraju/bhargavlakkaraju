import {
  cloudStorageEnabled,
  readCloudJson,
  mutateCloudJson,
} from "../cloud-store";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AiUsageEvent,
  EntryPatch,
  NewEntry,
  NewUsageEvent,
  TestimonialEntry,
} from "../types";
import type { EntryRepository } from "./repository";

interface LocalStore {
  entries: TestimonialEntry[];
  usage: AiUsageEvent[];
}

/**
 * JSON-file repository used when Supabase is not configured (local development,
 * smoke tests). Not for production use.
 */
export class LocalFileRepository implements EntryRepository {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path: string) {}

  private async load(): Promise<LocalStore> {
    if (cloudStorageEnabled())
      return (
        (await readCloudJson<LocalStore>("db.json"))?.value ?? {
          entries: [],
          usage: [],
        }
      );
    try {
      const raw = await readFile(this.path, "utf8");
      const parsed = JSON.parse(raw) as Partial<LocalStore>;
      return { entries: parsed.entries ?? [], usage: parsed.usage ?? [] };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return { entries: [], usage: [] };
    }
  }

  private async save(store: LocalStore): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path + ".tmp", JSON.stringify(store, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(this.path + ".tmp", this.path);
  }

  private locked<T>(fn: (store: LocalStore) => Promise<T> | T): Promise<T> {
    if (cloudStorageEnabled())
      return mutateCloudJson<LocalStore, T>(
        "db.json",
        () => ({ entries: [], usage: [] }),
        fn,
      );
    const run = this.queue.then(async () => {
      const store = await this.load();
      const result = await fn(store);
      await this.save(store);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  createEntry(entry: NewEntry): Promise<TestimonialEntry> {
    return this.locked((store) => {
      const now = new Date().toISOString();
      const row: TestimonialEntry = {
        ...entry,
        id: randomUUID(),
        created_at: now,
        updated_at: now,
      };
      store.entries.unshift(row);
      return row;
    });
  }

  async getEntry(id: string): Promise<TestimonialEntry | null> {
    const store = await this.load();
    return store.entries.find((e) => e.id === id) ?? null;
  }

  updateEntry(id: string, patch: EntryPatch): Promise<TestimonialEntry> {
    return this.locked((store) => {
      const idx = store.entries.findIndex((e) => e.id === id);
      const current = store.entries[idx];
      if (idx < 0 || !current) throw new Error(`Entry ${id} not found`);
      const next: TestimonialEntry = {
        ...current,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      store.entries[idx] = next;
      return next;
    });
  }

  async listEntries(limit = 200, offset = 0): Promise<TestimonialEntry[]> {
    const store = await this.load();
    return [...store.entries]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(offset, offset + limit);
  }

  async listCompletedEntries(
    limit = 100,
    offset = 0,
  ): Promise<TestimonialEntry[]> {
    const store = await this.load();
    return store.entries
      .filter((e) => e.status === "completed" && e.video_url)
      .sort((a, b) =>
        (b.completed_at ?? "").localeCompare(a.completed_at ?? ""),
      )
      .slice(offset, offset + limit);
  }

  insertUsage(event: NewUsageEvent): Promise<AiUsageEvent> {
    return this.locked((store) => {
      const now = new Date().toISOString();
      const row: AiUsageEvent = {
        ...event,
        id: randomUUID(),
        created_at: now,
        updated_at: now,
      };
      store.usage.unshift(row);
      return row;
    });
  }

  async listUsage(limit = 2000, offset = 0): Promise<AiUsageEvent[]> {
    const store = await this.load();
    return store.usage.slice(offset, offset + limit);
  }
}
