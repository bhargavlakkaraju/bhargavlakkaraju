import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { PipelineError } from "../types";

let client: NeonQueryFunction<false, false> | null = null;

function connection(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new PipelineError("The database is not configured yet. Ask the administrator to set DATABASE_URL.", undefined, "config");
  client = neon(url);
  return client;
}

/** Parameterised query helper; rows come back as plain JSON objects. */
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    const rows = await connection().query(text, params);
    return rows as T[];
  } catch (error) {
    throw new PipelineError("The database request failed. Please try again.", error instanceof Error ? error.message : String(error), "db");
  }
}

export async function queryOne<T>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
