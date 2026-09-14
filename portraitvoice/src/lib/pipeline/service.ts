import { randomUUID } from "node:crypto";
import { getRepository } from "../db";
import {
  createVideo,
  getVideo,
  HeyGenError,
  mapJobStatus,
  providerMessage,
  uploadAsset,
} from "../heygen";
import { storeMedia, readStoredUrl, downloadMedia } from "../media-store";
import { LANGUAGE_CODES } from "../languages";
import { addOutdoorAmbience } from "../ambience";
import { probeDuration, transcodeToMp3 } from "../media";
import type { InputMode, Stage, TestimonialEntry, VoiceGender } from "../types";
import { buildAvatarJob } from "./avatar";
import { readNote, OCR_MODEL } from "./ocr";
import { buildVoiceJob, validateScript } from "./voice";
import {
  assertOwner,
  findRequest,
  hashToken,
  newToken,
  registerUpload,
  requireAudio,
  requireUpload,
  saveWorkflow,
  withWorkflowLock,
  type Workflow,
  type StageJob,
} from "./store";

export class PipelineError extends Error {
  constructor(
    message: string,
    readonly friendly = message,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}
export function toFriendlyError(error: unknown): PipelineError {
  if (error instanceof PipelineError) return error;
  if (error instanceof HeyGenError)
    return new PipelineError(error.message, error.friendly);
  return new PipelineError(
    "Generation service error",
    error instanceof Error &&
      /reconnect|resumed|upload|recording|duration|seconds|consent|recovery|in progress|before|complete|could not|Could not|time|speech|Please|Hindi|note/i.test(
        error.message,
      )
      ? error.message
      : "Something interrupted generation. Resume to check the same request.",
  );
}
export interface UploadResult {
  id: string;
  url: string;
  durationSec: number | null;
}
function imageType(bytes: Uint8Array) {
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71)
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  throw new PipelineError("Please upload a valid JPG, PNG or WebP photo.");
}
export async function uploadImageFile(file: File): Promise<UploadResult> {
  if (!file.size || file.size > 15 * 1024 * 1024)
    throw new PipelineError("Please upload a photo under 15 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const up = await storeMedia(bytes, imageType(bytes));
  await registerUpload(up.id, up.url, "image", null);
  return { ...up, durationSec: null };
}
export async function uploadAudioFile(file: File): Promise<UploadResult> {
  if (!file.size || file.size > 30 * 1024 * 1024)
    throw new PipelineError("Please upload a recording under 30 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
  if (
    ![
      "mp3",
      "wav",
      "m4a",
      "aac",
      "ogg",
      "webm",
      "mp4",
      "caf",
      "opus",
      "flac",
      "3gp",
      "amr",
    ].includes(ext)
  )
    throw new PipelineError(
      "Please upload an MP3, WAV, M4A, OGG or WebM recording.",
    );
  const input = new Uint8Array(await file.arrayBuffer());
  const duration = await probeDuration(input, ext);
  if (duration < 1 || duration > 180)
    throw new PipelineError(
      "Please choose a playable recording between 1 second and 3 minutes.",
    );
  const out =
    ext === "mp3"
      ? { bytes: input, durationSec: duration }
      : await transcodeToMp3(input, ext);
  const up = await storeMedia(out.bytes, "audio/mpeg");
  await registerUpload(up.id, up.url, "audio", out.durationSec);
  return { ...up, durationSec: out.durationSec };
}
async function entry(id: string): Promise<TestimonialEntry> {
  const e = await getRepository().getEntry(id);
  if (!e) throw new PipelineError("This video request could not be found.");
  return e;
}
async function fail(id: string, error: unknown) {
  const msg = toFriendlyError(error).friendly;
  await getRepository().updateEntry(id, {
    status: "failed",
    error_message: msg,
  });
  return msg;
}
function submission(w: Workflow, stage: Stage, j: StageJob) {
  return {
    entryId: w.id,
    jobId: j.id,
    stage,
    estimatedSeconds: stage === "portrait" ? 3 : 240,
  };
}
function emptyEntry(inputMode: InputMode, language: string) {
  return {
    status: "processing" as const,
    current_stage: null,
    input_mode: inputMode,
    language,
    voice_id: null,
    voice_name: null,
    voice_gender: null,
    script_text: null,
    source_portrait_url: null,
    portrait_url: null,
    audio_url: null,
    motion_url: null,
    video_url: null,
    error_message: null,
    completed_at: null,
  };
}
export interface ExtractionResult {
  text: string;
  entryId: string;
  token: string;
}
export async function extractNoteText(
  file: File,
  language: string,
): Promise<ExtractionResult> {
  if (!file.size || file.size > 15 * 1024 * 1024)
    throw new PipelineError("Please upload a note under 15 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = new File([Buffer.from(bytes)], file.name, {
    type: imageType(bytes),
  });
  const e = await getRepository().createEntry(emptyEntry("note", language));
  const token = newToken();
  const w: Workflow = {
    id: e.id,
    tokenHash: hashToken(token),
    jobs: [],
    provider: "heygen",
  };
  await saveWorkflow(w);
  try {
    const { text, tokens } = await readNote(checked, language);
    w.extractionText = text;
    await saveWorkflow(w);
    await getRepository().updateEntry(e.id, {
      script_text: text.slice(0, 700),
      error_message: "Awaiting author review and consent",
    });
    await getRepository().insertUsage({
      entry_id: e.id,
      provider: "Vercel AI Gateway",
      model: OCR_MODEL,
      stage: "extraction",
      units: tokens,
      unit_type: "tokens",
      credits: 0,
    });
    return { text, entryId: e.id, token };
  } catch (error) {
    const friendly = new PipelineError(
      "Note reading is temporarily unavailable. Please try again or type your words.",
    );
    await fail(e.id, friendly);
    throw friendly;
  }
}
export interface CreateEntryInput {
  sourcePortraitUrl: string;
  sourcePortraitId: string;
  inputMode: InputMode;
  language: string;
  gender: VoiceGender | null;
  scriptText: string | null;
  audioUrl: string | null;
  extraction: { entryId: string; token: string } | null;
  consent: true;
  ambience?: boolean;
  requestId: string;
  token: string;
}
export async function submitPortraitStage(input: CreateEntryInput) {
  return withWorkflowLock(input.requestId, async () => {
    if (input.consent !== true)
      throw new PipelineError(
        "Your consent is required before creating a video.",
      );
    if (!LANGUAGE_CODES.includes(input.language))
      throw new PipelineError("Please choose a supported language.");
    const upload = await requireUpload(
      input.sourcePortraitId,
      input.sourcePortraitUrl,
    );
    if (upload.kind !== "image")
      throw new PipelineError("Please upload a portrait photo.");
    let duration: number | undefined;
    if (input.inputMode === "audio") {
      if (!input.audioUrl)
        throw new PipelineError("Please upload a recording.");
      duration = (await requireAudio(input.audioUrl)).durationSec ?? undefined;
    } else {
      if (!input.gender)
        throw new PipelineError("Please choose a voice gender.");
      validateScript(input.scriptText ?? "", input.language);
    }
    const existing = await findRequest(input.requestId);
    if (existing) {
      const w = await assertOwner(existing.id, input.token),
        j = w.jobs.find((j) => j.stage === "portrait");
      if (j) return submission(w, "portrait", j);
      throw new PipelineError(
        "This request is already in progress. Please resume it.",
      );
    }
    let e: TestimonialEntry, w: Workflow;
    if (input.inputMode === "note") {
      if (!input.extraction)
        throw new PipelineError(
          "Please read and confirm your note before continuing.",
        );
      w = await assertOwner(input.extraction.entryId, input.extraction.token);
      if (!w.extractionText || w.requestId)
        throw new PipelineError(
          "Please confirm an unused note before continuing.",
        );
      e = await entry(w.id);
      w.tokenHash = hashToken(input.token);
    } else {
      e = await getRepository().createEntry(
        emptyEntry(input.inputMode, input.language),
      );
      w = { id: e.id, tokenHash: hashToken(input.token), jobs: [] };
    }
    w.requestId = input.requestId;
    w.consentAt = new Date().toISOString();
    w.ambience = input.ambience ?? false;
    w.provider = "heygen";
    w.audioDuration = duration;
    const voice =
      input.inputMode === "audio" || !input.gender
        ? null
        : buildVoiceJob(input.scriptText ?? "", input.language, input.gender)
            .voice;
    // Preserve the supplied identity and background. No image-generation charge.
    const portraitJob: StageJob = {
      id: randomUUID(),
      model: "original portrait",
      provider: "local",
      stage: "portrait",
      credits: 0,
      units: 1,
      resolved: true,
    };
    w.jobs.push(portraitJob);
    await saveWorkflow(w);
    await getRepository().updateEntry(e.id, {
      status: "processing",
      current_stage: "avatar",
      language: input.language,
      source_portrait_url: input.sourcePortraitUrl,
      portrait_url: input.sourcePortraitUrl,
      script_text:
        input.inputMode === "audio"
          ? null
          : validateScript(input.scriptText ?? "", input.language),
      audio_url: input.inputMode === "audio" ? input.audioUrl : null,
      voice_id: voice?.id ?? null,
      voice_name: voice?.name ?? null,
      voice_gender: input.inputMode === "audio" ? null : input.gender,
      error_message: null,
    });
    return submission(w, "portrait", portraitJob);
  });
}
function assertCurrent(w: Workflow) {
  if (w.provider !== "heygen")
    throw new PipelineError(
      "This unfinished request used the previous generator. Please create a new video with HeyGen. Your completed videos are still available.",
    );
}
// Kept only for old clients; new clients submit speech and animation together.
export async function submitVoiceStage(
  id: string,
  token: string,
): Promise<never> {
  await assertOwner(id, token);
  throw new PipelineError(
    "Please refresh PortraitVoice. Speech is now created together with your HeyGen video.",
  );
}
export async function submitAvatarStage(
  id: string,
  clientDuration: number,
  token: string,
) {
  return withWorkflowLock(id, async () => {
    const w = await assertOwner(id, token),
      e = await entry(id);
    assertCurrent(w);
    const existing = w.jobs.find((j) => j.stage === "avatar");
    if (existing) return submission(w, "avatar", existing);
    if (!w.consentAt || !e.portrait_url)
      throw new PipelineError(
        "Your portrait and consent must be ready before video generation.",
      );
    if (w.submitting)
      throw new PipelineError(
        "This submission needs administrator recovery before another render can start. This prevents a duplicate charge.",
      );
    if (!w.imageAssetId) {
      const source = await readStoredUrl(e.portrait_url);
      w.imageAssetId = await uploadAsset(
        source.bytes,
        source.record.type,
        `${id}:image`,
      );
      await saveWorkflow(w);
    }
    if (e.input_mode === "audio" && !w.audioAssetId) {
      if (!e.audio_url)
        throw new PipelineError("Please upload your recording.");
      const audio = await readStoredUrl(e.audio_url);
      const duration = await probeDuration(audio.bytes, "mp3");
      if (
        duration < 1 ||
        duration > 180 ||
        !Number.isFinite(clientDuration) ||
        Math.abs(clientDuration - duration) > 3
      )
        throw new PipelineError(
          "The recording duration could not be verified. Please upload it again.",
        );
      w.audioDuration = duration;
      w.audioAssetId = await uploadAsset(
        audio.bytes,
        "audio/mpeg",
        `${id}:audio`,
      );
      await saveWorkflow(w);
    }
    const body = buildAvatarJob({
      entryId: id,
      imageAssetId: w.imageAssetId,
      ...(w.audioAssetId
        ? { audioAssetId: w.audioAssetId }
        : { script: e.script_text ?? "" }),
      language: e.language,
      gender: e.voice_gender,
    });
    w.submitting = "avatar";
    await saveWorkflow(w);
    let video;
    try {
      video = await createVideo(body, `${id}:avatar`);
    } catch (error) {
      // Definite rejections are safe to retry. Ambiguous timeouts/409 retain the guard.
      if (
        error instanceof HeyGenError &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 409
      ) {
        delete w.submitting;
        await saveWorkflow(w);
      }
      throw error;
    }
    const jobId = video.video_id ?? video.id;
    if (!jobId)
      throw new PipelineError(
        "HeyGen submission needs administrator recovery. Please do not create a duplicate video.",
      );
    const job: StageJob = {
      id: jobId,
      provider: "heygen",
      model: "Avatar IV",
      stage: "avatar",
      credits: 0,
      units: 1,
    };
    w.jobs.push(job);
    delete w.submitting;
    await saveWorkflow(w);
    await getRepository().insertUsage({
      entry_id: id,
      provider: "HeyGen",
      model:
        e.input_mode === "audio"
          ? "Avatar IV · original audio"
          : "Avatar IV + ElevenLabs v3",
      stage: "avatar",
      units: 1,
      unit_type: "videos",
      credits: 0,
    });
    await getRepository().updateEntry(id, {
      status: "processing",
      current_stage: "avatar",
      error_message: null,
    });
    return submission(w, "avatar", job);
  });
}
export async function checkStageJob(
  id: string,
  stage: Stage,
  jobId: string,
  _duration: number | null,
  token: string,
) {
  return withWorkflowLock(id, async () => {
    const w = await assertOwner(id, token);
    assertCurrent(w);
    const registered = w.jobs.find((j) => j.id === jobId && j.stage === stage);
    if (!registered)
      throw new PipelineError(
        "This generation does not belong to the requested step.",
      );
    if (registered.resolved || stage === "portrait")
      return {
        status: "completed" as const,
        jobId,
        chained: false,
        error: null,
      };
    const job = await getVideo(jobId),
      status = mapJobStatus(job.status);
    if (status === "failed")
      return {
        status,
        jobId,
        chained: false,
        error: await fail(
          id,
          new PipelineError(
            providerMessage(400, job.failure_code ?? "render_failed"),
          ),
        ),
      };
    return { status, jobId, chained: false, error: null };
  });
}
export async function resolveStageJob(
  id: string,
  stage: Stage,
  jobId: string,
  token: string,
) {
  return withWorkflowLock(id, async () => {
    const w = await assertOwner(id, token);
    const current = await entry(id);
    const registered = w.jobs.find(
      (j) =>
        j.id === jobId &&
        (j.stage === stage || (stage === "avatar" && j.stage === "lipsync")),
    );
    if (!registered)
      throw new PipelineError("This job cannot complete the requested step.");
    const existingUrl =
      stage === "portrait"
        ? current.portrait_url
        : stage === "voice"
          ? current.audio_url
          : current.video_url;
    if (registered.resolved && existingUrl)
      return {
        stage,
        entry: current,
        url: existingUrl,
        durationSec: w.audioDuration ?? null,
      };
    assertCurrent(w);
    if (stage !== "avatar")
      throw new PipelineError("Please refresh to use the new generator.");
    const job = await getVideo(jobId);
    if (mapJobStatus(job.status) !== "completed" || !job.video_url)
      throw new PipelineError(
        "This step is still in progress. Please wait a moment.",
      );
    // Cache the durable output before updating the entry; retrying finalization never rerenders.
    if (!w.finalVideoUrl) {
      const bytes = await downloadMedia(job.video_url);
      if (current.input_mode !== "audio" && !w.finalAudioUrl) {
        const speech = await transcodeToMp3(bytes, "mp4");
        w.finalAudioUrl = (await storeMedia(speech.bytes, "audio/mpeg")).url;
        await saveWorkflow(w);
      }
      const mixed = w.ambience ? await addOutdoorAmbience(bytes) : bytes;
      w.finalVideoUrl = (await storeMedia(mixed, "video/mp4")).url;
      w.audioDuration = job.duration ?? w.audioDuration;
      await saveWorkflow(w);
    }
    const updated = await getRepository().updateEntry(id, {
      video_url: w.finalVideoUrl,
      audio_url: current.audio_url ?? w.finalAudioUrl ?? null,
      status: "completed",
      current_stage: null,
      error_message: null,
      completed_at: current.completed_at ?? new Date().toISOString(),
    });
    registered.resolved = true;
    await saveWorkflow(w);
    return {
      stage,
      entry: updated,
      url: w.finalVideoUrl,
      durationSec: w.audioDuration ?? null,
    };
  });
}
export async function resumeGeneration(id: string, token: string) {
  const w = await assertOwner(id, token);
  const e = await entry(id);
  if (e.status !== "completed") assertCurrent(w);
  return { entry: e, jobs: w.jobs, audioDuration: w.audioDuration ?? null };
}
