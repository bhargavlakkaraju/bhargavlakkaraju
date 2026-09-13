import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { resolveFfmpeg } from "./media";

function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let log = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("The ambience mix took too long. Please try again."));
    }, 120_000);
    child.stderr.on("data", (chunk: Buffer) => {
      log = (log + chunk.toString()).slice(-12_000);
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("The audio mixer could not start."));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(log);
      else
        reject(
          new Error("Could not finish the ambience mix. Please try again."),
        );
    });
  });
}

/** Mix a quiet, speech-ducked field bed after lip sync; copy every video packet. */
export async function addOutdoorAmbience(
  video: Uint8Array,
): Promise<Uint8Array> {
  const bin = await resolveFfmpeg();
  if (!bin) throw new Error("Outdoor ambience needs FFmpeg on the server.");
  const dir = await mkdtemp(join(tmpdir(), "pv-ambience-"));
  try {
    const source = join(dir, "source.mp4");
    const output = join(dir, "finished.mp4");
    const mixedAudio = join(dir, "ambience.wav");
    await writeFile(source, video);
    const log = await run(bin, [
      "-hide_banner",
      "-i",
      source,
      "-t",
      "0",
      "-f",
      "null",
      "-",
    ]);
    const parts = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
    const duration = parts
      ? Number(parts[1]) * 3600 + Number(parts[2]) * 60 + Number(parts[3])
      : 0;
    if (!Number.isFinite(duration) || duration <= 0 || duration > 1800)
      throw new Error("Could not read the video length for the ambience mix.");
    const fadeOut = Math.max(0, duration - 0.8).toFixed(3);
    const filters = [
      "[0:a:0]asplit=2[voice][rawkey]",
      // Pad only the detector so the compressor cannot end the speech mix early.
      "[rawkey]apad=pad_dur=2[key]",
      `[1:a:0]volume=0.8,afade=t=in:d=0.6,afade=t=out:st=${fadeOut}:d=0.8[bed]`,
      "[bed][key]sidechaincompress=threshold=0.06:ratio=2.5:attack=100:release=650:makeup=1[quiet]",
      "[voice][quiet]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mix]",
    ].join(";");
    await run(bin, [
      "-y",
      "-hide_banner",
      "-i",
      source,
      "-stream_loop",
      "-1",
      "-i",
      resolve("public/audio/outdoor-ambience.mp3"),
      "-filter_complex",
      filters,
      "-map",
      "[mix]",
      "-vn",
      "-c:a",
      "pcm_f32le",
      mixedAudio,
    ]);
    // Mux separately: complex audio filters with copied video can end early
    // on some FFmpeg versions. A complete WAV preserves the final syllable.
    await run(bin, [
      "-y",
      "-hide_banner",
      "-i",
      source,
      "-i",
      mixedAudio,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      output,
    ]);
    return new Uint8Array(await readFile(output));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
