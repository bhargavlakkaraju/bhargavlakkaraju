import { getRepository } from "../db";
import { env } from "../env";
import { fallbackCredits, STAGE_BILLING } from "../credits";
import {
  createJob,
  estimateCost,
  getJob,
  HiggsfieldError,
  jobFailureMessage,
  mapJobStatus,
  uploadFromUrl,
  uploadMedia,
  assertMediaUrl,
} from "../higgsfield";
import { LANGUAGE_CODES } from "../languages";
import { addOutdoorAmbience } from "../ambience";
import { probeDuration, transcodeToMp3 } from "../media";
import type {
  InputMode,
  Stage,
  TestimonialEntry,
  UsageStage,
  VoiceGender,
} from "../types";
import { buildAvatarJob, clipSecondsFor, LIPSYNC_MODEL } from "./avatar";
import { buildOcrJob, OCR_LLM } from "./ocr";
import { buildPortraitJob, type JobSpec } from "./portrait";
import { buildVoiceJob, MAX_SCRIPT_CHARS } from "./voice";
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
  if (error instanceof HiggsfieldError)
    return new PipelineError(error.message, error.friendly);
  return new PipelineError(
    "Generation service error",
    error instanceof Error &&
      /reconnect|resumed|upload|recording|duration|seconds|consent|recovery|in progress|before|complete|could not|Could not|time|speech/i.test(
        error.message,
      )
      ? error.message
      : "Something interrupted generation. Please try again in a moment.",
  );
}
export interface UploadResult {
  id: string;
  url: string;
  durationSec: number | null;
}
export async function uploadImageFile(file: File): Promise<UploadResult> {
  if (!file.size || file.size > 15 * 1024 * 1024)
    throw new PipelineError("Please upload a photo under 15 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (!png && !jpg && !webp)
    throw new PipelineError("Please upload a valid JPG, PNG or WebP photo.");
  const up = await uploadMedia(
    "image",
    bytes,
    png ? "png" : jpg ? "jpg" : "webp",
  );
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
  if (!duration || duration > 180)
    throw new PipelineError(
      "Please choose a playable recording between 1 second and 3 minutes.",
    );
  // No trimming, noise removal or synthesis: preserve the original performance.
  const out =
    ext === "mp3"
      ? { bytes: input, durationSec: duration }
      : await transcodeToMp3(input, ext);
  const up = await uploadMedia("audio", out.bytes, "mp3");
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
async function tracked(
  w: Workflow,
  spec: JobSpec,
  stage: UsageStage,
  units: number,
): Promise<StageJob> {
  if (w.submitting)
    throw new PipelineError(
      "This request needs recovery by the administrator before another generation can start. This avoids charging for the same step twice.",
    );
  const credits =
    (await estimateCost(spec.jobSetType, spec.costParams ?? spec.params)) ??
    fallbackCredits(stage, units);
  w.submitting = stage;
  await saveWorkflow(w);
  let id: string;
  try {
    id = await createJob(spec.jobSetType, spec.params);
  } catch (error) {
    // A definite 4xx means no job was accepted. A lost response is ambiguous: keep the guard.
    if (
      error instanceof HiggsfieldError &&
      error.status >= 400 &&
      error.status < 500
    ) {
      delete w.submitting;
      await saveWorkflow(w);
    }
    throw error;
  }
  const job: StageJob = { id, model: spec.jobSetType, stage, credits, units };
  w.jobs.push(job);
  delete w.submitting;
  await saveWorkflow(w);
  const billing = STAGE_BILLING[stage];
  await getRepository().insertUsage({
    entry_id: w.id,
    provider: "Higgsfield",
    model:
      spec.jobSetType === "llm_text"
        ? `llm_text / ${OCR_LLM}`
        : spec.jobSetType === "text2speech_v2"
          ? "text2speech_v2 / ElevenLabs"
          : spec.jobSetType,
    stage,
    units,
    unit_type: billing.unitType,
    credits,
  });
  return job;
}
function submission(w: Workflow, stage: Stage, j: StageJob) {
  return {
    entryId: w.id,
    jobId: j.id,
    stage,
    estimatedSeconds: stage === "portrait" ? 50 : stage === "voice" ? 30 : 180,
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
  const uploaded = await uploadImageFile(file);
  const e = await getRepository().createEntry(emptyEntry("note", language));
  const token = newToken(),
    w: Workflow = { id: e.id, tokenHash: hashToken(token), jobs: [] };
  await saveWorkflow(w);
  try {
    const j = await tracked(w, buildOcrJob(uploaded.id), "extraction", 1);
    const started = Date.now();
    while (Date.now() - started < 120000) {
      const job = await getJob(j.id),
        status = mapJobStatus(job.status);
      if (status === "failed") throw new PipelineError(jobFailureMessage(job));
      if (status === "completed") {
        const text = (job.text ?? "").trim();
        if (!text)
          throw new PipelineError(
            "We could not read this note. Please retake it in good light or type your testimonial.",
          );
        w.extractionText = text;
        await saveWorkflow(w);
        await getRepository().updateEntry(e.id, {
          script_text: text.slice(0, 700),
          error_message: "Awaiting author review and consent",
        });
        return { text, entryId: e.id, token };
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    throw new PipelineError(
      "Reading the note took too long. Please type the text or try a clearer photo.",
    );
  } catch (error) {
    await fail(e.id, error);
    throw error;
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
    await requireUpload(input.sourcePortraitId, input.sourcePortraitUrl);
    if (input.inputMode === "audio") {
      if (!input.audioUrl)
        throw new PipelineError("Please upload a recording.");
      await requireAudio(input.audioUrl);
    } else if (
      !input.scriptText?.trim() ||
      input.scriptText.length > MAX_SCRIPT_CHARS ||
      !input.gender
    )
      throw new PipelineError(
        "Please add up to 700 characters and choose a voice gender.",
      );
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
      if (!w.extractionText)
        throw new PipelineError("Please confirm the extracted text first.");
      if (w.requestId)
        throw new PipelineError(
          "This note already belongs to a video in progress.",
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
    await saveWorkflow(w);
    const voice =
      input.inputMode === "audio" || !input.gender
        ? null
        : buildVoiceJob(input.scriptText ?? "", input.language, input.gender)
            .voice;
    await getRepository().updateEntry(e.id, {
      status: "processing",
      current_stage: "portrait",
      language: input.language,
      source_portrait_url: input.sourcePortraitUrl,
      script_text:
        input.inputMode === "audio" ? null : input.scriptText?.trim(),
      audio_url: input.inputMode === "audio" ? input.audioUrl : null,
      voice_id: voice?.id ?? null,
      voice_name: voice?.name ?? null,
      voice_gender: input.inputMode === "audio" ? null : input.gender,
      error_message: null,
    });
    try {
      return submission(
        w,
        "portrait",
        await tracked(
          w,
          buildPortraitJob(input.sourcePortraitId),
          "portrait",
          1,
        ),
      );
    } catch (error) {
      await fail(w.id, error);
      throw error;
    }
  });
}
export async function submitVoiceStage(id: string, token: string) {
  return withWorkflowLock(id, async () => {
    const w = await assertOwner(id, token),
      e = await entry(id),
      existing = w.jobs.find((j) => j.stage === "voice");
    if (existing) return submission(w, "voice", existing);
    if (
      !e.portrait_url ||
      !e.script_text ||
      !e.voice_gender ||
      e.input_mode === "audio"
    )
      throw new PipelineError(
        "The portrait must complete before creating speech.",
      );
    try {
      const spec = buildVoiceJob(e.script_text, e.language, e.voice_gender);
      await getRepository().updateEntry(id, {
        current_stage: "voice",
        status: "processing",
      });
      return submission(
        w,
        "voice",
        await tracked(w, spec, "voice", e.script_text.length),
      );
    } catch (error) {
      await fail(id, error);
      throw error;
    }
  });
}
export async function submitAvatarStage(
  id: string,
  clientDuration: number,
  token: string,
) {
  return withWorkflowLock(id, async () => {
    const w = await assertOwner(id, token),
      e = await entry(id),
      existing = w.jobs.find((j) => j.stage === "avatar");
    if (existing) return submission(w, "avatar", existing);
    if (!e.portrait_url || !e.audio_url)
      throw new PipelineError(
        "The portrait and voice must complete before video generation.",
      );
    try {
      assertMediaUrl(e.audio_url);
      const response = await fetch(e.audio_url, {
        signal: AbortSignal.timeout(60000),
        redirect: "error",
      });
      if (!response.ok)
        throw new PipelineError("The speech could not be downloaded.");
      const bytes = new Uint8Array(await response.arrayBuffer()),
        duration = await probeDuration(bytes, "mp3");
      if (duration <= 0 || duration > 180)
        throw new PipelineError(
          "The recording must be between 1 second and 3 minutes.",
        );
      if (
        !Number.isFinite(clientDuration) ||
        Math.abs(clientDuration - duration) > 3
      )
        throw new PipelineError(
          "The recording duration could not be verified. Please try again.",
        );
      w.audioDuration = duration;
      await saveWorkflow(w);
      const clip = clipSecondsFor(env.AVATAR_ENGINE, Math.min(duration, 8));
      const portrait = await uploadFromUrl("image", e.portrait_url);
      const spec = buildAvatarJob({
        engine: env.AVATAR_ENGINE,
        resolution: env.AVATAR_RESOLUTION,
        portraitMediaId: portrait.id,
        audioMediaId: null,
        durationSec: clip,
        language: e.language,
      });
      await getRepository().updateEntry(id, {
        current_stage: "avatar",
        status: "processing",
      });
      return submission(w, "avatar", await tracked(w, spec, "avatar", clip));
    } catch (error) {
      await fail(id, error);
      throw error;
    }
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
    const registered = w.jobs.find(
      (j) =>
        j.id === jobId &&
        (j.stage === stage || (stage === "avatar" && j.stage === "lipsync")),
    );
    if (!registered)
      throw new PipelineError(
        "This generation does not belong to the requested step.",
      );
    const sync = w.jobs.find((j) => j.stage === "lipsync");
    if (stage === "avatar" && sync && sync.id !== jobId)
      return {
        status: "in_progress" as const,
        jobId: sync.id,
        chained: true,
        error: null,
      };
    const job = await getJob(jobId),
      status = mapJobStatus(job.status);
    if (status === "failed") {
      const error = await fail(id, new PipelineError(jobFailureMessage(job)));
      return { status, jobId, chained: false, error };
    }
    if (
      status === "completed" &&
      stage === "avatar" &&
      registered.stage !== "lipsync"
    ) {
      try {
        const e = await entry(id);
        if (!job.result_url || !e.audio_url)
          throw new PipelineError("The generated clip could not be found.");
        await getRepository().updateEntry(id, { motion_url: job.result_url });
        const video = await uploadFromUrl("video", job.result_url),
          audio = await uploadFromUrl("audio", e.audio_url);
        const next = await tracked(
          w,
          {
            jobSetType: LIPSYNC_MODEL,
            params: {
              input_video: { id: video.id, type: "video_input" },
              input_audio: { id: audio.id, type: "audio_input" },
              sync_mode: "loop",
            },
          },
          "lipsync",
          Math.ceil(w.audioDuration ?? 0),
        );
        return {
          status: "in_progress" as const,
          jobId: next.id,
          chained: true,
          error: null,
        };
      } catch (error) {
        return {
          status: "failed" as const,
          jobId,
          chained: false,
          error: await fail(id, error),
        };
      }
    }
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
    const w = await assertOwner(id, token),
      registered = w.jobs.find(
        (j) =>
          j.id === jobId &&
          j.stage === (stage === "avatar" ? "lipsync" : stage),
      );
    if (!registered)
      throw new PipelineError("This job cannot complete the requested step.");
    const current = await entry(id);
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
    const job = await getJob(jobId);
    if (mapJobStatus(job.status) !== "completed" || !job.result_url)
      throw new PipelineError(
        "This step is still in progress. Please wait a moment.",
      );
    const e = await entry(id);
    let url = job.result_url;
    if (stage === "avatar" && w.ambience) {
      if (!w.ambienceVideoUrl) {
        assertMediaUrl(url);
        const response = await fetch(url, {
          signal: AbortSignal.timeout(120_000),
          redirect: "error",
        });
        if (!response.ok)
          throw new PipelineError(
            "Could not prepare the final video. Please resume to retry.",
          );
        const bytes = new Uint8Array(await response.arrayBuffer());
        const mixed = await addOutdoorAmbience(bytes);
        w.ambienceVideoUrl = (await uploadMedia("video", mixed, "mp4")).url;
        await saveWorkflow(w);
      }
      url = w.ambienceVideoUrl;
    }
    let updated: TestimonialEntry;
    if (stage === "portrait")
      updated = await getRepository().updateEntry(id, {
        portrait_url: url,
        current_stage: e.input_mode === "audio" ? "avatar" : "voice",
      });
    else if (stage === "voice")
      updated = await getRepository().updateEntry(id, {
        audio_url: url,
        current_stage: "avatar",
      });
    else
      updated = await getRepository().updateEntry(id, {
        video_url: url,
        status: "completed",
        current_stage: null,
        error_message: null,
        completed_at: e.completed_at ?? new Date().toISOString(),
      });
    registered.resolved = true;
    await saveWorkflow(w);
    return {
      stage,
      entry: updated,
      url,
      durationSec:
        stage === "voice"
          ? (job.meta?.duration ?? null)
          : (w.audioDuration ?? null),
    };
  });
}
export async function resumeGeneration(id: string, token: string) {
  const w = await assertOwner(id, token);
  return {
    entry: await entry(id),
    jobs: w.jobs,
    audioDuration: w.audioDuration ?? null,
  };
}
