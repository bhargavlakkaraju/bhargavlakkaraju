/**
 * Server-side environment. Loads `.env` once (Node 20.12+ built-in loader) so
 * secrets work in `vite dev` and in the built server without extra deps.
 */
const loaded = Symbol.for("portraitvoice.envLoaded");
const g = globalThis as unknown as Record<symbol, boolean | undefined>;
if (!g[loaded]) {
  g[loaded] = true;
  try {
    process.loadEnvFile?.(".env");
  } catch {
    // no .env file – rely on the process environment
  }
}

export type AvatarEngine = "grok";
export type AvatarResolution = "480p" | "720p";

function read(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

export const env = {
  HIGGSFIELD_API_KEY: read("HIGGSFIELD_API_KEY"),
  HIGGSFIELD_API_URL: read("HIGGSFIELD_API_URL", "https://fnf.higgsfield.ai"),
  SUPABASE_URL: read("SUPABASE_URL", read("VITE_SUPABASE_URL")),
  SUPABASE_SERVICE_ROLE_KEY: read("SUPABASE_SERVICE_ROLE_KEY"),
  AVATAR_ENGINE: "grok" as AvatarEngine,
  AVATAR_RESOLUTION: (read("AVATAR_RESOLUTION", "720p") === "480p"
    ? "480p"
    : "720p") as AvatarResolution,
  LOCAL_DB_PATH: read("LOCAL_DB_PATH", ".data/db.json"),
} as const;
