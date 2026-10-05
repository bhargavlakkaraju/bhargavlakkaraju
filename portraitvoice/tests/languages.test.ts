import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { LANGUAGES } from "../src/lib/languages";
import { validateScript } from "../src/lib/script";
let dir: string;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "pv-languages-"));
  process.env.LOCAL_DB_PATH = join(dir, "db.json");
  process.env.HEYGEN_API_KEY = "mock";
  delete process.env.PV_STORAGE;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});
after(async () => {
  await rm(dir, { recursive: true, force: true });
});
test("output catalog includes requested languages and script validation catches unresolved OCR and size", () => {
  for (const code of [
    "en",
    "hi",
    "pa",
    "te",
    "ta",
    "kn",
    "mr",
    "bn",
    "gu",
    "or",
  ])
    assert.ok(LANGUAGES.some((l) => l.code === code));
  assert.throws(() => validateScript("[unclear]", "en"));
  assert.throws(() => validateScript("a".repeat(701), "en"));
  assert.equal(validateScript("मेरी कहानी", "hi"), "मेरी कहानी");
  assert.equal(validateScript("ମୋ କାହାଣୀ", "or"), "ମୋ କାହାଣୀ");
});
test("existing video translation is owned, uses self-serve precision without proofread, idempotent, and saved as a separate output", async () => {
  const service = await import("../src/lib/pipeline/service");
  const { getRepository } = await import("../src/lib/db");
  const store = await import("../src/lib/pipeline/store");
  const { storeMedia } = await import("../src/lib/media-store");
  const sourceToken = store.newToken(),
    token = store.newToken();
  const video = await storeMedia(
    await readFile("public/demo-ugc.mp4"),
    "video/mp4",
  );
  const source = await getRepository().createEntry({
    status: "completed",
    current_stage: null,
    input_mode: "text",
    language: "en",
    voice_id: null,
    voice_name: null,
    voice_gender: "female",
    script_text: "My own story.",
    source_portrait_url: null,
    portrait_url: video.url,
    audio_url: null,
    motion_url: null,
    video_url: video.url,
    error_message: null,
    completed_at: new Date().toISOString(),
  });
  await store.saveWorkflow({
    id: source.id,
    tokenHash: store.hashToken(sourceToken),
    provider: "heygen",
    jobs: [],
    consentAt: new Date().toISOString(),
  });
  let renders = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api_keys/self"))
      return Response.json({
        data: { scopes: ["translations:write"], status: "active" },
      });
    if (url.endsWith("/video-translations") && init?.method === "POST") {
      renders++;
      const body = JSON.parse(String(init.body));
      assert.equal(body.mode, "precision");
      assert.equal(body.translate_audio_only, false);
      assert.deepEqual(body.output_languages, ["Hindi (India)"]);
      assert.equal(body.video.url, video.url);
      assert.equal(body.srt, undefined);
      assert.ok(new Headers(init?.headers).get("Idempotency-Key"));
      return Response.json({
        data: { video_translation_ids: ["translation_mock"] },
      });
    }
    if (url.endsWith("/video-translations/translation_mock"))
      return Response.json({
        data: {
          id: "translation_mock",
          status: "completed",
          video_url: "https://files.heygen.ai/translated.mp4",
          duration: 4,
        },
      });
    if (url.endsWith("translated.mp4"))
      return new Response(await readFile("public/demo-ugc.mp4"));
    throw new Error("Unexpected request: " + url);
  };
  try {
    const input = {
      sourceId: source.id,
      sourceToken,
      language: "hi",
      token,
      requestId: randomUUID(),
      consent: true as const,
    };
    await assert.rejects(
      service.prepareExistingVideoTranslation({
        ...input,
        sourceToken: store.newToken(),
      }),
    );
    const result = await service.prepareExistingVideoTranslation(input);
    const again = await service.prepareExistingVideoTranslation(input);
    assert.equal(result.entryId, again.entryId);
    assert.equal(renders, 0); // No paid call during preparation.
    await assert.rejects(
      service.prepareExistingVideoTranslation({ ...input, language: "te" }),
      /different source or language/,
    );
    const job = await service.submitAvatarStage(result.entryId, 0, token);
    await service.submitAvatarStage(result.entryId, 0, token);
    assert.equal(renders, 1);
    const checked = await service.checkStageJob(
      result.entryId,
      "avatar",
      job.jobId,
      null,
      token,
    );
    assert.equal(checked.status, "completed");
    const output = await service.resolveStageJob(
      result.entryId,
      "avatar",
      job.jobId,
      token,
    );
    assert.equal(output.entry.language, "hi");
    assert.equal(output.entry.status, "completed");
    assert.notEqual(output.entry.id, source.id);
    assert.equal(
      (await getRepository().getEntry(source.id))?.video_url,
      video.url,
    );
    await service.resolveStageJob(result.entryId, "avatar", job.jobId, token);
    assert.equal(renders, 1);
    const ambiguous = await service.prepareExistingVideoTranslation({
      ...input,
      language: "te",
      requestId: randomUUID(),
      token: store.newToken(),
    });
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts++;
      throw new Error("Connection lost after submission");
    };
    await assert.rejects(
      service.submitAvatarStage(ambiguous.entryId, 0, ambiguous.token),
      /Connection lost/,
    );
    await assert.rejects(
      service.submitAvatarStage(ambiguous.entryId, 0, ambiguous.token),
      /duplicate charge/,
    );
    assert.equal(attempts, 1);
    await assert.rejects(
      service.retryFailedVideo(ambiguous.entryId, ambiguous.token),
      /cannot be retried/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("retry starts only a provider-confirmed failed output with a new idempotency key", async () => {
  const service = await import("../src/lib/pipeline/service");
  const { newToken, getWorkflow } = await import("../src/lib/pipeline/store");
  const image = await service.uploadImageFile(
    new File(
      [await readFile("e2e/fixtures/example-portrait.png")],
      "photo.png",
      { type: "image/png" },
    ),
  );
  const token = newToken();
  const portrait = await service.submitPortraitStage({
    sourcePortraitId: image.id,
    sourcePortraitUrl: image.url,
    inputMode: "text",
    language: "hi",
    gender: "female",
    scriptText: "मेरी अपनी कहानी।",
    audioUrl: null,
    extraction: null,
    consent: true,
    requestId: randomUUID(),
    token,
    sourceLanguage: "en",
    sourceScript: "My own story.",
    batchId: randomUUID(),
  });
  const original = globalThis.fetch;
  let submits = 0;
  let confirmedFailed = false;
  const keys: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/assets/direct-uploads"))
      return Response.json({
        data: {
          asset_id: "image_retry",
          upload_url: "https://heygen-test.s3.amazonaws.com/image",
        },
      });
    if (init?.method === "PUT") return new Response(null);
    if (url.endsWith("/assets/image_retry/complete"))
      return Response.json({ data: { id: "image_retry" } });
    if (url.endsWith("/v3/videos") && init?.method === "POST") {
      submits++;
      keys.push(new Headers(init.headers).get("Idempotency-Key")!);
      return Response.json({
        data: { video_id: `retry_video_${submits}`, status: "pending" },
      });
    }
    if (url.includes("/v3/videos/retry_video_"))
      return Response.json({
        data: {
          id: "retry_video_1",
          status: confirmedFailed ? "failed" : "pending",
          failure_code: "render_failed",
        },
      });
    throw new Error("Unexpected request " + url);
  };
  try {
    const first = await service.submitAvatarStage(portrait.entryId, 0, token);
    await assert.rejects(service.retryFailedVideo(portrait.entryId, token));
    assert.equal(submits, 1);
    confirmedFailed = true;
    await service.checkStageJob(
      portrait.entryId,
      "avatar",
      first.jobId,
      null,
      token,
    );
    await service.retryFailedVideo(portrait.entryId, token);
    await service.submitAvatarStage(portrait.entryId, 0, token);
    await service.submitAvatarStage(portrait.entryId, 0, token);
    assert.equal(submits, 2);
    assert.notEqual(keys[0], keys[1]);
    assert.equal(
      (await getWorkflow(portrait.entryId))?.sourceScript,
      "My own story.",
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("translation write permission also authorizes read capability", async () => {
  const { translationCapabilities } = await import("../src/lib/heygen");
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({
        data: { scopes: ["translations:write"], status: "active" },
      });
    assert.equal((await translationCapabilities()).available, true);
    globalThis.fetch = async () =>
      Response.json({
        data: { scopes: ["translations:read"], status: "active" },
      });
    assert.equal((await translationCapabilities()).available, false);
  } finally {
    globalThis.fetch = original;
  }
});
