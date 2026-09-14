import { env } from "./env";
import type { JobStatus } from "./types";

export class HeyGenError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly friendly: string,
  ) {
    super(`HeyGen ${status}: ${code}`);
    this.name = "HeyGenError";
  }
}
export function providerMessage(status: number, code: string): string {
  if (status === 402 || /credit|balance|quota|insufficient/i.test(code))
    return "HeyGen’s API balance is too low for this video. The administrator can check HeyGen API billing.";
  if (status === 401 || status === 403)
    return "HeyGen needs to reconnect. Please contact the administrator.";
  if (status === 429) return "HeyGen is busy. Resume this request in a moment.";
  if (/face|image|photo/i.test(code))
    return "HeyGen could not use this portrait. Choose a clear, front-facing photo.";
  if (/safety|moderation|nsfw/i.test(code))
    return "HeyGen could not accept this photo or wording. Please review your inputs.";
  return "HeyGen could not finish this request. Resume to check it, or contact the administrator.";
}
export async function heygen<T>(
  path: string,
  body?: unknown,
  idempotencyKey?: string,
): Promise<T> {
  if (!env.HEYGEN_API_KEY)
    throw new HeyGenError(401, "not_configured", providerMessage(401, ""));
  const response = await fetch(`https://api.heygen.com/v3${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "x-api-key": env.HEYGEN_API_KEY,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(120_000),
    redirect: "error",
  });
  const json = (await response.json()) as {
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (!response.ok || json.error) {
    const code = json.error?.code || `http_${response.status}`;
    throw new HeyGenError(
      response.status,
      code,
      providerMessage(
        response.status,
        code + " " + (json.error?.message ?? ""),
      ),
    );
  }
  if (!json.data)
    throw new HeyGenError(502, "missing_data", providerMessage(502, ""));
  return json.data;
}
export interface HeyGenVideo {
  id?: string;
  video_id?: string;
  status: string;
  video_url?: string;
  duration?: number;
  failure_code?: string;
  failure_message?: string;
}
export const createVideo = (body: unknown, key: string) =>
  heygen<HeyGenVideo>("/videos", body, key);
export const getVideo = (id: string) =>
  heygen<HeyGenVideo>(`/videos/${encodeURIComponent(id)}`);
export function mapJobStatus(status: string): JobStatus {
  if (["completed", "done", "success"].includes(status)) return "completed";
  if (["failed", "error", "cancelled", "canceled", "rejected"].includes(status))
    return "failed";
  if (["pending", "waiting", "queued", "created"].includes(status))
    return "queued";
  return "in_progress";
}
export async function uploadAsset(
  bytes: Uint8Array,
  contentType: string,
  key: string,
) {
  const slot = await heygen<{
    asset_id: string;
    upload_url: string;
    upload_headers?: Record<string, string>;
  }>(
    "/assets/direct-uploads",
    {
      filename: `portraitvoice.${contentType === "audio/mpeg" ? "mp3" : contentType.split("/")[1]}`,
      content_type: contentType,
      size_bytes: bytes.length,
    },
    key,
  );
  const url = new URL(slot.upload_url);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.endsWith(".amazonaws.com")
  )
    throw new Error("Unrecognized upload destination.");
  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType, ...slot.upload_headers },
    body: Buffer.from(bytes),
    signal: AbortSignal.timeout(120_000),
    redirect: "error",
  });
  if (!put.ok)
    throw new Error(
      "The photo or recording upload was interrupted. Please resume.",
    );
  await heygen(
    `/assets/${encodeURIComponent(slot.asset_id)}/complete`,
    {},
    `${key}:complete`,
  );
  return slot.asset_id;
}
