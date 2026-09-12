import { optionalEnv, requireEnv } from "../env.server";
import { EXTENSION_PROMPT, NOTE_OCR_PROMPT, PORTRAIT_PROMPT, TALKING_HEAD_PROMPT } from "../prompts";
import { GROK_CLIP_SECONDS, GROK_EXTENSION_SECONDS, PipelineError } from "../types";

const BASE = "https://api.x.ai/v1";
export const XAI_IMAGE_MODEL = (): string => optionalEnv("XAI_IMAGE_MODEL", "grok-imagine-image-2.0");
export const XAI_TEXT_MODEL = (): string => optionalEnv("XAI_TEXT_MODEL", "grok-4.6");
export const XAI_VIDEO_MODEL = (): string => optionalEnv("XAI_VIDEO_MODEL", "grok-imagine-video-1.5");

function headers(): HeadersInit {
  return { Authorization: `Bearer ${requireEnv("XAI_API_KEY", "The xAI service")}`, "Content-Type": "application/json" };
}

function raiseForStatus(res: Response, json: unknown, what: string): void {
  if (res.ok) return;
  const detail = `${res.status} ${JSON.stringify(json).slice(0, 300)}`;
  if (res.status === 401 || res.status === 402 || res.status === 403) {
    throw new PipelineError(`${what} credits are exhausted or access is denied. Please contact the administrator.`, detail, "balance");
  }
  if (res.status === 429) throw new PipelineError(`${what} is busy right now. Please try again in a minute.`, detail, "rate_limit");
  if (res.status === 400 || res.status === 422) throw new PipelineError(`${what} rejected the input. Please try a different photo or wording.`, detail, "rejected");
  throw new PipelineError(`${what} failed. Please try again.`, detail);
}

async function postJson<T>(path: string, body: Record<string, unknown>, what: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T;
  raiseForStatus(res, json, what);
  return json;
}

/** Re-frames a portrait into a 9:16 rural UGC composition. Returns a temporary xAI URL. */
export async function editPortrait(sourceUrl: string): Promise<string> {
  const json = await postJson<{ data?: { url?: string }[] }>(
    "/images/edits",
    { model: XAI_IMAGE_MODEL(), prompt: PORTRAIT_PROMPT, image: { url: sourceUrl }, aspect_ratio: "9:16", response_format: "url" },
    "Portrait editing",
  );
  const url = json.data?.[0]?.url;
  if (!url) throw new PipelineError("The image model did not return a portrait. Please try a clearer photo.");
  return url;
}

interface ResponsesOutput {
  output_text?: string;
  output?: { type?: string; content?: { type?: string; text?: string }[] }[];
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
}

/** OCR of a handwritten note (original language kept). */
export async function extractNoteText(imageUrl: string): Promise<{ text: string; tokens: number }> {
  const json = await postJson<ResponsesOutput>(
    "/responses",
    {
      model: XAI_TEXT_MODEL(),
      input: [
        {
          role: "user",
          content: [
            { type: "input_image", image_url: imageUrl, detail: "high" },
            { type: "input_text", text: NOTE_OCR_PROMPT },
          ],
        },
      ],
    },
    "Note reading",
  );
  const text =
    json.output_text ??
    (json.output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? "")
      .join("");
  const cleaned = text.trim();
  if (!cleaned) throw new PipelineError("No readable text was found. Try a brighter, closer photo of the note.");
  const usage = json.usage;
  const tokens = usage?.total_tokens ?? (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0);
  return { text: cleaned, tokens };
}

export type VideoPoll =
  | { state: "pending"; progress: number | null }
  | { state: "done"; videoUrl: string }
  | { state: "failed"; message: string };

/** Animates the reframed portrait into a talking clip of `seconds` (2-15). */
export async function startImageToVideo(imageUrl: string, seconds: number, audioUrl?: string): Promise<string> {
  const duration = Math.min(GROK_CLIP_SECONDS, Math.max(2, Math.round(seconds)));
  const body: Record<string, unknown> = {
    model: XAI_VIDEO_MODEL(),
    prompt: TALKING_HEAD_PROMPT,
    image: { url: imageUrl },
    duration,
    aspect_ratio: "9:16",
    resolution: optionalEnv("XAI_VIDEO_RESOLUTION", "720p"),
  };
  if (audioUrl) body.reference_audios = [{ url: audioUrl }];
  const json = await postJson<{ request_id?: string }>("/videos/generations", body, "Video generation");
  if (!json.request_id) throw new PipelineError("Could not start video generation. Please try again.");
  return json.request_id;
}

/** Extends an existing Grok clip by `seconds` (2-10). */
export async function startExtension(videoUrl: string, seconds: number): Promise<string> {
  const duration = Math.min(GROK_EXTENSION_SECONDS, Math.max(2, Math.round(seconds)));
  const json = await postJson<{ request_id?: string }>(
    "/videos/extensions",
    { model: XAI_VIDEO_MODEL(), prompt: EXTENSION_PROMPT, video: { url: videoUrl }, duration },
    "Video extension",
  );
  if (!json.request_id) throw new PipelineError("Could not extend the video. Please try again.");
  return json.request_id;
}

export async function pollVideo(requestId: string): Promise<VideoPoll> {
  const res = await fetch(`${BASE}/videos/${encodeURIComponent(requestId)}`, { headers: headers() });
  const json = (await res.json().catch(() => ({}))) as {
    status?: string;
    progress?: number | null;
    video?: { url?: string };
    error?: { code?: string; message?: string };
  };
  if (res.status === 404) return { state: "failed", message: "The video request expired. Please try again." };
  if (!res.ok) throw new PipelineError("Could not check video progress. Retrying…", `${res.status}`);
  if (json.status === "done" && json.video?.url) return { state: "done", videoUrl: json.video.url };
  if (json.status === "failed" || json.status === "expired") {
    const message =
      json.error?.code === "permission_denied"
        ? "Video generation credits are exhausted or access is denied. Please contact the administrator."
        : `Video generation failed${json.error?.message ? `: ${json.error.message}` : ""}. Please try another photo.`;
    return { state: "failed", message };
  }
  return { state: "pending", progress: typeof json.progress === "number" ? json.progress : null };
}
