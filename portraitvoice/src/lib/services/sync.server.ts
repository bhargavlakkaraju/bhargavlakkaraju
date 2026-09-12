import { optionalEnv, requireEnv } from "../env.server";
import { PipelineError } from "../types";

export const LIPSYNC_MODEL = (): string => optionalEnv("SYNC_LIPSYNC_MODEL", "lipsync-2-pro");
const BASE = "https://api.sync.so/v2";

export type SyncPoll = { state: "pending" } | { state: "done"; videoUrl: string } | { state: "failed"; message: string };

function headers(): HeadersInit {
  return { "x-api-key": requireEnv("SYNC_API_KEY", "The lip-sync service"), "Content-Type": "application/json" };
}

/** Re-times the mouth in `videoUrl` to `audioUrl`; the audio sets the final length. */
export async function startLipsync(videoUrl: string, audioUrl: string): Promise<string> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: LIPSYNC_MODEL(),
      input: [
        { type: "video", url: videoUrl },
        { type: "audio", url: audioUrl },
      ],
      options: { sync_mode: "bounce", temperature: 0.55 },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; errorCode?: string; message?: string | string[] };
  if (res.status === 401 || res.status === 402 || res.status === 403) {
    throw new PipelineError("Lip-sync credits are exhausted or access is denied. Please contact the administrator.", `${res.status} ${json.errorCode ?? ""}`, "balance");
  }
  if (res.status === 429) throw new PipelineError("The lip-sync service is busy. Please try again in a few minutes.", "429", "rate_limit");
  if (!res.ok || !json.id) throw new PipelineError("Could not start lip-sync. Please try again.", `${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json.id;
}

export async function pollLipsync(id: string): Promise<SyncPoll> {
  const res = await fetch(`${BASE}/generate/${encodeURIComponent(id)}`, { headers: headers() });
  const json = (await res.json().catch(() => ({}))) as { status?: string; outputUrl?: string; error?: string };
  if (!res.ok) throw new PipelineError("Could not check lip-sync progress. Retrying…", `${res.status}`);
  if (json.status === "COMPLETED" && json.outputUrl) return { state: "done", videoUrl: json.outputUrl };
  if (json.status === "FAILED" || json.status === "REJECTED") {
    return {
      state: "failed",
      message: `Lip-sync ${json.status === "REJECTED" ? "was rejected" : "failed"}${json.error ? `: ${json.error}` : ""}. Please try a clearer front-facing photo.`,
    };
  }
  return { state: "pending" };
}
