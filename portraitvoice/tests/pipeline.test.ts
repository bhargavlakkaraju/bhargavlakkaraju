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
  process.env.HEYGEN_API_KEY = "test-token";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.PV_STORAGE;
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});
test("HeyGen submits once, binds ownership and stages, persists final video without another charge", async () => {
  const service = await import("../src/lib/pipeline/service");
  const { getRepository } = await import("../src/lib/db");
  const { newToken, getWorkflow } = await import("../src/lib/pipeline/store");
  const original = globalThis.fetch;
  let submitted = 0;
  let savedPayload: Record<string, unknown> = {};
  const jobId = "video_heygen_test_123";
  globalThis.fetch = async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const url = String(input);
    assert.ok(!/higgsfield|grok|sync.so/i.test(url));
    if (url.endsWith("/assets/direct-uploads"))
      return Response.json({
        data: {
          asset_id: "asset_test",
          upload_url: "https://heygen-test.s3.amazonaws.com/photo",
          upload_headers: {
            "content-type": "image/png",
            "x-amz-server-side-encryption": "AES256",
          },
        },
      });
    if (init?.method === "PUT") {
      const headers = new Headers(init.headers);
      assert.equal(headers.get("content-type"), "image/png");
      assert.equal(headers.get("x-amz-server-side-encryption"), "AES256");
      return new Response(null);
    }
    if (url.endsWith("/assets/asset_test/complete"))
      return Response.json({ data: { id: "asset_test" } });
    if (url.endsWith("/v3/videos") && init?.method === "POST") {
      submitted++;
      assert.ok((init.headers as Record<string, string>)["Idempotency-Key"]);
      savedPayload = JSON.parse(String(init.body)) as Record<string, unknown>;
      return Response.json({ data: { video_id: jobId, status: "pending" } });
    }
    if (url.endsWith(`/v3/videos/${jobId}`))
      return Response.json({
        data: {
          id: jobId,
          status: "completed",
          video_url: "https://files.heygen.ai/test.mp4",
          duration: 4,
        },
      });
    if (url === "https://files.heygen.ai/test.mp4")
      return new Response(await readFile("public/demo-ugc.mp4"));
    throw new Error("Unexpected request " + url);
  };
  try {
    await assert.rejects(
      () => service.uploadImageFile(new File(["fake"], "p.png")),
      /valid JPG/,
    );
    const source = await service.uploadImageFile(
      new File([await readFile("public/favicon.png")], "p.png", {
        type: "image/png",
      }),
    );
    const data = {
      sourcePortraitUrl: source.url,
      sourcePortraitId: source.id,
      inputMode: "text" as const,
      language: "hi",
      gender: "female" as const,
      scriptText: "नमस्ते। यह एक परीक्षण है।",
      audioUrl: null,
      extraction: null,
      consent: true as const,
      ambience: false,
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
    await assert.rejects(
      () =>
        service.submitPortraitStage({
          ...data,
          scriptText: "Namaste aap kaise hain",
        }),
      /देवनागरी/,
    );
    const [first, second] = await Promise.all([
      service.submitPortraitStage(data),
      service.submitPortraitStage(data),
    ]);
    assert.equal(first.entryId, second.entryId);
    assert.equal(submitted, 0);
    await assert.rejects(
      () => service.submitAvatarStage(first.entryId, 0, newToken()),
      /resumed/,
    );
    const [a, b] = await Promise.all([
      service.submitAvatarStage(first.entryId, 0, data.token),
      service.submitAvatarStage(first.entryId, 0, data.token),
    ]);
    assert.equal(a.jobId, b.jobId);
    assert.equal(submitted, 1);
    assert.equal(savedPayload.script, data.scriptText);
    assert.equal(savedPayload.voice_id, "ebb41c845de849d2b101bd56ea9773af");
    assert.equal(
      (savedPayload.voice_settings as { engine_settings: { model: string } })
        .engine_settings.model,
      "eleven_v3",
    );
    await assert.rejects(
      () =>
        service.checkStageJob(
          first.entryId,
          "portrait",
          a.jobId,
          null,
          data.token,
        ),
      /does not belong/,
    );
    await assert.rejects(
      () =>
        service.resolveStageJob(first.entryId, "voice", a.jobId, data.token),
      /cannot complete/,
    );
    const check = await service.checkStageJob(
      first.entryId,
      "avatar",
      a.jobId,
      null,
      data.token,
    );
    assert.equal(check.status, "completed");
    const result = await service.resolveStageJob(
      first.entryId,
      "avatar",
      a.jobId,
      data.token,
    );
    assert.equal(result.entry.status, "completed");
    assert.match(result.url, /\/api\/media\//);
    const repeated = await service.resolveStageJob(
      first.entryId,
      "avatar",
      a.jobId,
      data.token,
    );
    assert.equal(repeated.url, result.url);
    assert.equal(submitted, 1);
    assert.equal((await getWorkflow(first.entryId))?.provider, "heygen");
    const usage = await getRepository().listUsage();
    assert.equal(usage.length, 1);
    assert.equal(usage[0]?.provider, "HeyGen");
  } finally {
    globalThis.fetch = original;
  }
});
test("ambiguous submit failure retains the guard and never silently charges twice", async () => {
  const s = await import("../src/lib/pipeline/service");
  const store = await import("../src/lib/pipeline/store");
  const source = await s.uploadImageFile(
    new File([await readFile("public/favicon.png")], "p.png"),
  );
  const token = store.newToken();
  const p = await s.submitPortraitStage({
    sourcePortraitUrl: source.url,
    sourcePortraitId: source.id,
    inputMode: "text",
    language: "hi",
    gender: "male",
    scriptText: "यह एक परीक्षण है।",
    audioUrl: null,
    extraction: null,
    consent: true,
    requestId: randomUUID(),
    token,
  });
  const w = await store.getWorkflow(p.entryId);
  assert.ok(w);
  w.imageAssetId = "cached_image";
  await store.saveWorkflow(w);
  let count = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    count++;
    throw new TypeError("Network connection lost");
  };
  try {
    await assert.rejects(
      () => s.submitAvatarStage(p.entryId, 0, token),
      /Network/,
    );
    await assert.rejects(
      () => s.submitAvatarStage(p.entryId, 0, token),
      /recovery/,
    );
    assert.equal(count, 1);
  } finally {
    globalThis.fetch = original;
  }
});
test("original recordings bypass speech synthesis in the HeyGen payload", async () => {
  const { buildAvatarJob } = await import("../src/lib/pipeline/avatar");
  const result = buildAvatarJob({
    entryId: "test",
    imageAssetId: "portrait",
    audioAssetId: "recording",
    language: "hi",
    gender: null,
  });
  assert.ok("audio_asset_id" in result);
  assert.equal(result.audio_asset_id, "recording");
  assert.ok(!("script" in result));
  assert.ok(!("voice_settings" in result));
  assert.equal(result.resolution, "1080p");
  assert.equal(result.expressiveness, "medium");
});
test("remote media allowlist and video byte ranges", async () => {
  const { assertMediaUrl, mediaResponse } =
    await import("../src/lib/media-store");
  for (const url of [
    "http://127.0.0.1/foo",
    "https://example.com/x",
    "https://heygen.ai.evil.test/a",
    "https://files.heygen.ai:8000/x",
    "https://u:p@files.heygen.ai/x",
  ])
    assert.throws(() => assertMediaUrl(url));
  assert.doesNotThrow(() =>
    assertMediaUrl("https://files.heygen.ai/video.mp4"),
  );
  assert.doesNotThrow(() =>
    assertMediaUrl("https://d8j0ntlcm91z4.cloudfront.net/test.mp4"),
  );
  const r = mediaResponse(
    new Uint8Array([0, 1, 2, 3, 4]),
    "video/mp4",
    "bytes=1-3",
  );
  assert.equal(r.status, 206);
  assert.equal(r.headers.get("Content-Range"), "bytes 1-3/5");
  assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [1, 2, 3]);
  assert.equal(
    mediaResponse(new Uint8Array(5), "video/mp4", "bytes=7-9").status,
    416,
  );
});
