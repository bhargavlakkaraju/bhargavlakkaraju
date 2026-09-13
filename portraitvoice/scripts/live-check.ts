/** Explicitly invoked live acceptance test: uses real Higgsfield credits. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  uploadImageFile,
  submitPortraitStage,
  submitVoiceStage,
  submitAvatarStage,
  checkStageJob,
  resolveStageJob,
} from "../src/lib/pipeline/service";
import { probeDuration } from "../src/lib/media";
import { newToken } from "../src/lib/pipeline/store";
import type { Stage } from "../src/lib/types";
const token = newToken();
const portrait = await uploadImageFile(
  new File(
    [await readFile("e2e/fixtures/example-portrait.png")],
    "example.png",
    {
      type: "image/png",
    },
  ),
);
const input = {
  sourcePortraitId: portrait.id,
  sourcePortraitUrl: portrait.url,
  inputMode: "text" as const,
  language: "hi",
  gender: "female" as const,
  scriptText: "नमस्ते। यह एक तकनीकी परीक्षण है।",
  audioUrl: null,
  extraction: null,
  consent: true as const,
  requestId: randomUUID(),
  token,
};
const submission = await submitPortraitStage(input);
await mkdir(".data", { recursive: true });
await writeFile(
  ".data/live-acceptance.json",
  JSON.stringify({ entryId: submission.entryId, token }),
  { mode: 0o600 },
);
console.log("Portrait submitted", submission.entryId);
async function wait(stage: Stage, initial: string, duration: number | null) {
  let jobId = initial;
  const since = Date.now();
  for (;;) {
    const check = await checkStageJob(
      submission.entryId,
      stage,
      jobId,
      duration,
      token,
    );
    if (check.status === "failed") throw new Error(check.error ?? "Failed");
    if (check.chained) {
      jobId = check.jobId;
      console.log("Lip sync submitted");
    } else if (check.status === "completed")
      return resolveStageJob(submission.entryId, stage, jobId, token);
    if (Date.now() - since > 25 * 60000)
      throw new Error("Acceptance test timed out");
    await new Promise((r) => setTimeout(r, 6000));
  }
}
const p = await wait("portrait", submission.jobId, null);
console.log("Portrait complete");
const voice = await submitVoiceStage(submission.entryId, token);
const a = await wait("voice", voice.jobId, null);
console.log("Voice complete");
const bytes = new Uint8Array(await (await fetch(a.url)).arrayBuffer());
const duration = await probeDuration(bytes, "mp3");
console.log("Duration", duration);
const avatar = await submitAvatarStage(submission.entryId, duration, token);
console.log("Grok submitted");
const video = await wait("avatar", avatar.jobId, duration);
console.log("COMPLETE", video.url);
await writeFile(
  ".data/live-result.json",
  JSON.stringify(
    {
      entry: video.entry,
      portrait: p.url,
      audio: a.url,
      video: video.url,
      duration,
    },
    null,
    2,
  ),
);
