import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Audio helpers backed by ffmpeg (system binary or `ffmpeg-static`).
 * Normalize browser recordings to MP3 for consistent duration probing and uploads; recordings
 * (m4a / webm / ogg / wav) are transcoded here before upload.
 */

let ffmpegPathCache: string | null | undefined;

export async function resolveFfmpeg(): Promise<string | null> {
  if (ffmpegPathCache !== undefined) return ffmpegPathCache;
  const candidates: string[] = [];
  try {
    const mod = (await import("ffmpeg-static")) as { default?: string | null };
    if (typeof mod.default === "string" && mod.default)
      candidates.push(mod.default);
  } catch {
    // optional dependency missing
  }
  candidates.push("ffmpeg");
  for (const candidate of candidates) {
    if (await canRun(candidate)) {
      ffmpegPathCache = candidate;
      return candidate;
    }
  }
  ffmpegPathCache = null;
  return null;
}

function canRun(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(bin, ["-version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (err += d.toString()));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve(out + err)
        : reject(new Error(err.slice(-600) || `ffmpeg exited ${code}`)),
    );
  });
}

export async function hasFfmpeg(): Promise<boolean> {
  return (await resolveFfmpeg()) !== null;
}

export interface Mp3Result {
  bytes: Uint8Array;
  durationSec: number;
}

function parseDuration(log: string): number {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * Transcode any audio (or the audio track of a video) to a mono 44.1 kHz MP3.
 * Optionally trims to `maxSeconds`. Returns the bytes and the output duration.
 */
export async function transcodeToMp3(
  input: Uint8Array,
  inputExt: string,
  maxSeconds?: number,
): Promise<Mp3Result> {
  const bin = await resolveFfmpeg();
  if (!bin) {
    throw new Error(
      "ffmpeg is not available on the server, so only MP3 recordings can be accepted.",
    );
  }
  const dir = await mkdtemp(join(tmpdir(), "pv-audio-"));
  try {
    const src = join(dir, `in.${inputExt.replace(/[^a-z0-9]/gi, "") || "bin"}`);
    const dst = join(dir, "out.mp3");
    await writeFile(src, input);
    const args = [
      "-y",
      "-hide_banner",
      "-i",
      src,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "44100",
      "-b:a",
      "128k",
    ];
    if (maxSeconds && maxSeconds > 0) args.push("-t", String(maxSeconds));
    args.push("-f", "mp3", dst);
    await run(bin, args);
    const probeLog = await run(bin, [
      "-hide_banner",
      "-i",
      dst,
      "-f",
      "null",
      "-",
    ]).catch((e: Error) => e.message);
    return {
      bytes: new Uint8Array(await readFile(dst)),
      durationSec: parseDuration(probeLog),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Duration of an existing audio file in seconds (0 when ffmpeg is unavailable). */
export async function probeDuration(
  input: Uint8Array,
  ext: string,
): Promise<number> {
  const bin = await resolveFfmpeg();
  if (!bin) return 0;
  const dir = await mkdtemp(join(tmpdir(), "pv-probe-"));
  try {
    const src = join(dir, `in.${ext.replace(/[^a-z0-9]/gi, "") || "bin"}`);
    await writeFile(src, input);
    const log = await run(bin, [
      "-hide_banner",
      "-i",
      src,
      "-f",
      "null",
      "-",
    ]).catch((e: Error) => e.message);
    return parseDuration(log);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
