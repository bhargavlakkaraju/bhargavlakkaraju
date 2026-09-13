import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveFfmpeg } from "../src/lib/media";
import { addOutdoorAmbience } from "../src/lib/ambience";

const exec = promisify(execFile);
test("ambience preserves video and timing, adds quiet sound in pauses, and keeps speech dominant", async () => {
  const resolved = await resolveFfmpeg();
  assert.ok(resolved, "FFmpeg is required for the audio integration check");
  const ffmpeg: string = resolved;
  const dir = await mkdtemp(join(tmpdir(), "pv-mix-check-"));
  const source = join(dir, "source.mp4");
  const output = join(dir, "mix.mp4");
  try {
    await exec(ffmpeg, [
      "-y",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=green:s=90x160:r=25:d=4",
      "-f",
      "lavfi",
      "-i",
      "aevalsrc=0.25*sin(2*PI*440*t)*lt(mod(t\\,2)\\,1):s=48000:d=4",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      source,
    ]);
    await writeFile(output, await addOutdoorAmbience(await readFile(source)));
    const hash = async (file: string) =>
      (
        await exec(ffmpeg, [
          "-v",
          "error",
          "-i",
          file,
          "-map",
          "0:v:0",
          "-c",
          "copy",
          "-f",
          "hash",
          "-hash",
          "sha256",
          "-",
        ])
      ).stdout;
    assert.equal(
      await hash(source),
      await hash(output),
      "Every encoded video packet must remain unchanged",
    );
    async function pcm(file: string) {
      const { stdout } = await exec(
        ffmpeg,
        [
          "-v",
          "error",
          "-i",
          file,
          "-vn",
          "-ac",
          "1",
          "-ar",
          "48000",
          "-f",
          "f32le",
          "-",
        ],
        { encoding: "buffer", maxBuffer: 4_000_000 },
      );
      return new Float32Array(
        stdout.buffer.slice(
          stdout.byteOffset,
          stdout.byteOffset + stdout.byteLength,
        ),
      );
    }
    const before = await pcm(source),
      after = await pcm(output);
    assert.equal(
      after.length,
      before.length,
      "The audio timeline must not shift or stretch",
    );
    let signal = 0,
      error = 0,
      ambience = 0,
      peak = 0;
    for (let i = 0; i < after.length; i++) {
      peak = Math.max(peak, Math.abs(after[i]!));
      if (i > 2.15 * 48000 && i < 2.85 * 48000) {
        signal += before[i]! ** 2;
        error += (after[i]! - before[i]!) ** 2;
      }
      if (i > 1.15 * 48000 && i < 1.85 * 48000) ambience += after[i]! ** 2;
    }
    assert.ok(
      10 * Math.log10(signal / error) > 25,
      "Speech must stay at least 25 dB above the added signal",
    );
    assert.ok(
      ambience / (0.7 * 48000) > 1e-8,
      "Ambience should be present during a speech pause",
    );
    assert.ok(peak < 1, "The mix must not clip");
    await assert.rejects(
      () => addOutdoorAmbience(new Uint8Array([0, 1, 2])),
      /mix|length/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
