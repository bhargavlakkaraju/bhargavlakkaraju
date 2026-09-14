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

function read(name: string, fallback = ""): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

export const env = {
  HEYGEN_API_KEY: read("HEYGEN_API_KEY"),
  APP_URL: read(
    "APP_URL",
    process.env.VERCEL
      ? "https://portraitvoice.vercel.app"
      : "http://127.0.0.1:3000",
  ),
  SUPABASE_URL: read("SUPABASE_URL", read("VITE_SUPABASE_URL")),
  SUPABASE_SERVICE_ROLE_KEY: read("SUPABASE_SERVICE_ROLE_KEY"),
  AVATAR_ENGINE: "HeyGen Avatar IV",
  AVATAR_RESOLUTION: "1080p",
  LOCAL_DB_PATH: read("LOCAL_DB_PATH", ".data/db.json"),
} as const;
