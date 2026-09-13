import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "portraitvoice-test-"));
  process.env.LOCAL_DB_PATH = join(dir, "db.json");
  process.env.HIGGSFIELD_API_KEY = "test-token";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});
test("server consent, ownership, idempotent submissions and bound job results", async () => {
  const service = await import("../src/lib/pipeline/service");
  const { getRepository } = await import("../src/lib/db");
  const { newToken, getWorkflow } = await import("../src/lib/pipeline/store");
  const original = globalThis.fetch;
  let submitted = 0;
  let jobId = "";
  const uploadId = randomUUID();
  globalThis.fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);
    if (url.includes("/agents/uploads?"))
      return Response.json({
        id: uploadId,
        url: "https://d2ol7oe51mr4n9.cloudfront.net/test.png",
        upload_url: "https://d2ol7oe51mr4n9.cloudfront.net/upload",
      });
    if (url.endsWith("/confirm?type=image")) return Response.json({ ok: true });
    if (init?.method === "PUT") return new Response(null, { status: 200 });
    if (url.endsWith("/agents/jobs/cost")) return Response.json({ credits: 2 });
    if (url.endsWith("/agents/jobs") && init?.method === "POST") {
      submitted++;
      jobId = randomUUID();
      return Response.json([jobId]);
    }
    if (url.endsWith("/agents/jobs/" + jobId))
      return Response.json({
        id: jobId,
        status: "completed",
        job_set_type: "seedream_v4_5",
        result_url: "https://d8j0ntlcm91z4.cloudfront.net/result.png",
        text: null,
        meta: null,
      });
    throw new Error("Unexpected request " + url);
  };
  try {
    await assert.rejects(
      () =>
        service.uploadImageFile(
          new File(["fake"], "portrait.png", { type: "image/png" }),
        ),
      /valid JPG/,
    );
    assert.equal(submitted, 0);
    const source = await service.uploadImageFile(
      new File([await readFile("public/favicon.png")], "portrait.png", {
        type: "image/png",
      }),
    );
    const data = {
      sourcePortraitUrl: source.url,
      sourcePortraitId: source.id,
      inputMode: "text" as const,
      language: "hi",
      gender: "female" as const,
      scriptText: "नमस्ते",
      audioUrl: null,
      extraction: null,
      consent: true as const,
      ambience: true,
      requestId: randomUUID(),
      token: newToken(),
    };
    await assert.rejects(
      () =>
        service.submitPortraitStage({
          ...data,
          consent: false,
        } as unknown as Parameters<typeof service.submitPortraitStage>[0]),
      /consent/,
    );
    const [first, second] = await Promise.all([
      service.submitPortraitStage(data),
      service.submitPortraitStage(data),
    ]);
    assert.equal(first.entryId, second.entryId);
    assert.equal(submitted, 1);
    assert.equal((await getWorkflow(first.entryId))?.ambience, true);
    await assert.rejects(
      () => service.submitVoiceStage(first.entryId, newToken()),
      /resumed/,
    );
    await assert.rejects(
      () => service.submitVoiceStage(first.entryId, data.token),
      /portrait must complete/,
    );
    await assert.rejects(
      () => service.resolveStageJob(first.entryId, "avatar", jobId, data.token),
      /cannot complete/,
    );
    await assert.rejects(
      () =>
        service.checkStageJob(
          first.entryId,
          "portrait",
          randomUUID(),
          null,
          data.token,
        ),
      /does not belong/,
    );
    const result = await service.resolveStageJob(
      first.entryId,
      "portrait",
      jobId,
      data.token,
    );
    assert.equal(
      result.entry.portrait_url,
      "https://d8j0ntlcm91z4.cloudfront.net/result.png",
    );
    const usage = await getRepository().listUsage();
    assert.equal(usage.length, 1);
    assert.equal(usage[0]?.credits, 2);
  } finally {
    globalThis.fetch = original;
  }
});
test("remote media rejects local and unrecognized hosts", async () => {
  const { assertMediaUrl } = await import("../src/lib/higgsfield");
  for (const url of [
    "http://127.0.0.1/foo",
    "https://example.com/x",
    "https://cloudfront.net.evil.test/a",
    "https://a.cloudfront.net:8000/x",
    "https://u:p@a.cloudfront.net/x",
  ])
    assert.throws(() => assertMediaUrl(url));
  assert.doesNotThrow(() =>
    assertMediaUrl("https://d8j0ntlcm91z4.cloudfront.net/test.mp4"),
  );
});
test("Grok uses a start frame alone; exact audio belongs to the separate lip-sync pass", async () => {
  const { buildAvatarJob } = await import("../src/lib/pipeline/avatar");
  const spec = buildAvatarJob({
    engine: "grok",
    resolution: "720p",
    portraitMediaId: randomUUID(),
    audioMediaId: randomUUID(),
    durationSec: 95,
    language: "hi",
  });
  assert.equal(spec.jobSetType, "grok_video_v15");
  assert.equal(spec.params.duration, 8);
  assert.equal((spec.params.medias as unknown[]).length, 1);
});
