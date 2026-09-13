import { env } from "./env";
import { getHiggsfieldToken } from "./auth";
import type { JobStatus } from "./types";

/**
 * Minimal typed client for the Higgsfield agents API (the same API the
 * official `higgsfield` CLI and MCP use). All calls are server-only.
 */

export type HfMediaType = "image" | "audio" | "video";

export interface HfUpload {
  id: string;
  url: string;
}

export interface HfJob {
  id: string;
  status: string;
  job_set_type: string;
  result_url: string | null;
  text: string | null;
  meta: { duration?: number } | null;
  error?: string | null;
  detail?: string | null;
}

export interface HfMediaRef {
  id: string;
  type: string;
}

export class HiggsfieldError extends Error {
  readonly status: number;
  readonly friendly: string;
  constructor(status: number, message: string, friendly: string) {
    super(message);
    this.name = "HiggsfieldError";
    this.status = status;
    this.friendly = friendly;
  }
}

/** Reference to a file previously uploaded with {@link uploadMedia}. */
export function mediaInput(id: string): HfMediaRef {
  return { id, type: "media_input" };
}

function friendlyMessage(status: number, raw: string): string {
  const text = raw.toLowerCase();
  if (status === 401 || status === 403) {
    if (/credit|balance|insufficient|quota|plan/.test(text)) {
      return "The Higgsfield account has run out of credits. Please top up and try again.";
    }
    return "Higgsfield rejected the request (access denied). Please check the API key or account plan.";
  }
  if (status === 402 || /insufficient|not enough credits|balance/.test(text)) {
    return "Not enough Higgsfield credits to run this step. Please top up and try again.";
  }
  if (status === 429)
    return "Higgsfield is busy right now. Please wait a moment and try again.";
  if (status >= 500)
    return "Higgsfield is temporarily unavailable. Please try again in a minute.";
  if (status === 422)
    return "The generation request was rejected by Higgsfield. Please try a different photo or audio file.";
  return "Something went wrong while talking to Higgsfield. Please try again.";
}

function extractDetail(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const detail = (parsed as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((d) => {
            const item = d as { msg?: string; loc?: unknown[] };
            return `${Array.isArray(item.loc) ? item.loc.join(".") : ""}: ${item.msg ?? ""}`.trim();
          })
          .join("; ");
      }
      const message =
        (parsed as { message?: unknown; error?: unknown }).message ??
        (parsed as { error?: unknown }).error;
      if (typeof message === "string") return message;
    }
  } catch {
    // not JSON
  }
  return body.slice(0, 300);
}

async function hf<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getHiggsfieldToken();
  const res = await fetch(`${env.HIGGSFIELD_API_URL}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(60_000),
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Hf-Mcp-Client-Name": "portraitvoice",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    const detail = extractDetail(body);
    throw new HiggsfieldError(
      res.status,
      `Higgsfield ${res.status} on ${path}: ${detail}`,
      friendlyMessage(res.status, detail),
    );
  }
  return (body ? JSON.parse(body) : null) as T;
}

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  webm: "audio/webm",
  mp4: "video/mp4",
};

export function extensionForContentType(
  contentType: string,
  fallback: string,
): string {
  const ct = contentType.toLowerCase().split(";")[0]?.trim() ?? "";
  const hit = Object.entries(EXTENSION_CONTENT_TYPES).find(([, v]) => v === ct);
  if (hit) return hit[0];
  if (ct === "audio/x-m4a" || ct === "audio/x-wav" || ct === "audio/wave")
    return ct.includes("m4a") ? "m4a" : "wav";
  if (ct === "audio/mp3") return "mp3";
  return fallback;
}

/**
 * Upload raw bytes to Higgsfield storage and return the media id + CDN URL.
 * The presigned PUT is signed for a content type derived from the extension.
 */
export async function uploadMedia(
  type: HfMediaType,
  bytes: Uint8Array,
  extension: string,
): Promise<HfUpload> {
  const ext = extension.toLowerCase().replace(/^\./, "");
  if (type === "audio" && ext !== "mp3") {
    // Higgsfield audio inputs are always stored as .mp3 (the presigned PUT is signed for audio/mpeg).
    throw new Error("Audio must be transcoded to MP3 before upload");
  }
  const contentType = EXTENSION_CONTENT_TYPES[ext];
  if (!contentType) throw new Error(`Unsupported file type .${ext}`);
  const created = await hf<{ id: string; url: string; upload_url: string }>(
    `/agents/uploads?type=${type}&extension=${encodeURIComponent(ext)}`,
    { method: "POST", body: "{}" },
  );
  const put = await fetch(created.upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes as BodyInit,
  });
  if (!put.ok) {
    throw new HiggsfieldError(
      put.status,
      `Upload PUT failed (${put.status})`,
      "The file could not be uploaded. Please try again.",
    );
  }
  await hf(`/agents/uploads/${created.id}/confirm?type=${type}`, {
    method: "POST",
    body: "{}",
  });
  return { id: created.id, url: created.url };
}

/** Download a public URL (e.g. a previous job result) and re-upload it as a media input. */
export async function uploadFromUrl(
  type: HfMediaType,
  url: string,
): Promise<HfUpload> {
  assertMediaUrl(url);
  const res = await fetch(url, {
    signal: AbortSignal.timeout(120_000),
    redirect: "error",
  });
  if (!res.ok) throw new Error(`Could not fetch ${url} (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const pathExt = new URL(url).pathname.split(".").pop()?.toLowerCase() ?? "";
  const fallback = type === "image" ? "png" : type === "audio" ? "mp3" : "mp4";
  const ext = EXTENSION_CONTENT_TYPES[pathExt]
    ? pathExt
    : extensionForContentType(res.headers.get("content-type") ?? "", fallback);
  return uploadMedia(type, bytes, ext);
}

export async function createJob(
  jobSetType: string,
  params: Record<string, unknown>,
): Promise<string> {
  const ids = await hf<string[]>("/agents/jobs", {
    method: "POST",
    body: JSON.stringify({ job_set_type: jobSetType, params }),
  });
  const id = ids[0];
  if (!id)
    throw new HiggsfieldError(
      500,
      "Job create returned no id",
      "Higgsfield did not accept the job. Please try again.",
    );
  return id;
}

export async function getJob(id: string): Promise<HfJob> {
  return hf<HfJob>(`/agents/jobs/${id}`);
}

/** Best-effort credit estimate; returns null when the cost endpoint rejects the params. */
export async function estimateCost(
  jobSetType: string,
  params: Record<string, unknown>,
): Promise<number | null> {
  try {
    const res = await hf<{ credits: number; credits_exact?: number }>(
      "/agents/jobs/cost",
      {
        method: "POST",
        body: JSON.stringify({ job_set_type: jobSetType, params }),
      },
    );
    return typeof res.credits_exact === "number"
      ? res.credits_exact
      : res.credits;
  } catch {
    return null;
  }
}

export async function getBalance(): Promise<{
  credits: number;
  email: string;
}> {
  return hf<{ credits: number; email: string }>("/agents/balance");
}

export function mapJobStatus(status: string): JobStatus {
  const s = status.toLowerCase();
  if (s === "completed" || s === "done" || s === "success") return "completed";
  if (
    ["failed", "error", "nsfw", "canceled", "cancelled", "rejected"].includes(s)
  )
    return "failed";
  if (s === "queued" || s === "pending" || s === "created") return "queued";
  return "in_progress";
}

export function jobFailureMessage(job: HfJob): string {
  const raw = job.error ?? job.detail ?? "";
  if (/nsfw/i.test(job.status) || /nsfw|safety/i.test(raw)) {
    return "The generation was blocked by the content safety filter. Please use a different photo or wording.";
  }
  return raw
    ? `Generation failed: ${raw}`
    : "Generation failed on Higgsfield. Please try again.";
}

export function assertMediaUrl(url: string): void {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !["cloudfront.net", "higgsfield.ai", "higgsfield.cloud"].some(
      (h) => u.hostname === h || u.hostname.endsWith("." + h),
    )
  )
    throw new Error("Unrecognized media host. Please upload the file again.");
}
