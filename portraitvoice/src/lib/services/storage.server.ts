import { put } from "@vercel/blob";
import { requireEnv } from "../env.server";
import { PipelineError } from "../types";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "video/mp4": "mp4",
};

export function isSupportedUpload(kind: "image" | "audio", contentType: string): boolean {
  return contentType.startsWith(`${kind}/`) && EXT_BY_MIME[contentType] !== undefined;
}

/** Uploads bytes to the public Vercel Blob store and returns the public URL. */
export async function uploadBytes(folder: string, bytes: ArrayBuffer | Blob, contentType: string): Promise<string> {
  const token = requireEnv("BLOB_READ_WRITE_TOKEN", "File storage");
  const ext = EXT_BY_MIME[contentType] ?? "bin";
  const body = bytes instanceof Blob ? bytes : new Blob([bytes], { type: contentType });
  try {
    const blob = await put(`${folder}/${crypto.randomUUID()}.${ext}`, body, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      token,
    });
    return blob.url;
  } catch (error) {
    throw new PipelineError("Could not store the file. Please try again.", error instanceof Error ? error.message : String(error), "storage");
  }
}

/** Copies a temporary provider file into our storage so links never expire. */
export async function mirrorRemote(folder: string, url: string, fallbackType: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new PipelineError("Could not download the generated file.", `${res.status} ${url}`);
  const declared = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const type = EXT_BY_MIME[declared] ? declared : fallbackType;
  return uploadBytes(folder, await res.arrayBuffer(), type);
}
