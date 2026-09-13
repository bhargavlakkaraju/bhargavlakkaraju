import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "./env";
const exec = promisify(execFile);
let cached: { token: string; until: number } | null = null;
/** Server-only. Use the account owner's existing CLI login; never copy it to a browser. */
export async function getHiggsfieldToken(): Promise<string> {
  if (env.HIGGSFIELD_API_KEY) return env.HIGGSFIELD_API_KEY;
  if (cached && cached.until > Date.now()) return cached.token;
  try {
    const { stdout } = await exec(
      process.env.HIGGSFIELD_CLI_PATH || "higgsfield",
      ["auth", "token"],
      { timeout: 15000, maxBuffer: 64 * 1024 },
    );
    const token = stdout.trim();
    if (!token || /\s/.test(token)) throw new Error("Invalid token");
    cached = { token, until: Date.now() + 60_000 };
    return token;
  } catch {
    throw new Error(
      "The generation service needs to reconnect. The administrator can sign in with the Higgsfield CLI on the server.",
    );
  }
}
