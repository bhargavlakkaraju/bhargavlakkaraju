import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkAvatarStage, startAvatarStage } from "@/lib/pipeline/avatar.server";
import { runPortraitStage } from "@/lib/pipeline/portrait.server";
import { runVoiceStage } from "@/lib/pipeline/voice.server";
import {
  getEntry,
  insertEntry,
  listAllEntries,
  listCompletedEntries,
  listUsageEvents,
  markFailed,
  recordUsage,
  summarizeUsage,
} from "@/lib/services/entries.server";
import { isSupportedUpload, uploadBytes } from "@/lib/services/storage.server";
import { extractNoteText as ocrNote, XAI_TEXT_MODEL } from "@/lib/services/xai.server";
import {
  GENDERS,
  INPUT_MODES,
  LANGUAGE_CODES,
  MAX_AUDIO_SECONDS,
  MAX_SCRIPT_CHARS,
  PipelineError,
  STAGES,
  type AiUsageEvent,
  type FnResult,
  type JobCheck,
  type TestimonialEntry,
  type UsageSummaryRow,
} from "@/lib/types";

/** Every server function returns a plain result so the UI never sees a blank screen. */
async function guarded<T>(operation: () => Promise<T>): Promise<FnResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    if (error instanceof PipelineError) {
      console.error(`[portraitvoice:${error.code}]`, error.message);
      return { ok: false, error: { code: error.code, message: error.userMessage } };
    }
    console.error("[portraitvoice]", error);
    return { ok: false, error: { code: "unexpected", message: "Something went wrong. Please try again." } };
  }
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export interface UploadedMedia { url: string; contentType: string; size: number }

/** Multipart upload of a portrait, note photo or recording to public storage. */
export const uploadMedia = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    const file = data.get("file");
    const kind = data.get("kind");
    if (!(file instanceof File)) throw new Error("Choose a file to upload.");
    if (kind !== "image" && kind !== "audio") throw new Error("Unknown upload kind.");
    const uploadKind: "image" | "audio" = kind;
    return { file, kind: uploadKind };
  })
  .handler(({ data }): Promise<FnResult<UploadedMedia>> =>
    guarded(async () => {
      const contentType = data.file.type || (data.kind === "image" ? "image/jpeg" : "audio/mpeg");
      if (!isSupportedUpload(data.kind, contentType)) {
        throw new PipelineError(
          data.kind === "image" ? "Please upload a JPG, PNG or WebP photo." : "Please upload an MP3, WAV, M4A, OGG or WebM recording.",
        );
      }
      if (data.file.size > MAX_UPLOAD_BYTES) throw new PipelineError("Files must be 20 MB or smaller.");
      const url = await uploadBytes(`uploads/${data.kind}`, await data.file.arrayBuffer(), contentType);
      return { url, contentType, size: data.file.size };
    }),
  );

export const extractNoteText = createServerFn({ method: "POST" })
  .validator(z.object({ imageUrl: z.string().url() }))
  .handler(({ data }): Promise<FnResult<{ text: string }>> =>
    guarded(async () => {
      const result = await ocrNote(data.imageUrl);
      await recordUsage(null, "extraction", result.tokens / 1000, XAI_TEXT_MODEL());
      return { text: result.text.slice(0, MAX_SCRIPT_CHARS) };
    }),
  );

export const createTestimonialEntry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      inputMode: z.enum(INPUT_MODES),
      language: z.enum(LANGUAGE_CODES),
      gender: z.enum(GENDERS).nullable(),
      scriptText: z.string().max(MAX_SCRIPT_CHARS).nullable(),
      sourcePortraitUrl: z.string().url(),
      audioUrl: z.string().url().nullable(),
      audioSeconds: z.number().positive().max(MAX_AUDIO_SECONDS).nullable(),
    }),
  )
  .handler(({ data }): Promise<FnResult<TestimonialEntry>> =>
    guarded(async () => {
      if (data.inputMode === "audio" && !data.audioUrl) throw new PipelineError("Upload a voice recording first.");
      if (data.inputMode !== "audio" && !data.scriptText?.trim()) throw new PipelineError("Add the testimonial text first.");
      return insertEntry({
        input_mode: data.inputMode,
        language: data.language,
        voice_gender: data.inputMode === "audio" ? null : data.gender,
        voice_name: data.inputMode === "audio" ? "uploaded recording" : null,
        script_text: data.scriptText?.trim() ?? null,
        source_portrait_url: data.sourcePortraitUrl,
        audio_url: data.audioUrl,
        audio_seconds: data.audioSeconds,
      });
    }),
  );

const submitInput = z.object({
  entryId: z.string().uuid(),
  stage: z.enum(STAGES),
  audioSeconds: z.number().positive().max(MAX_AUDIO_SECONDS).optional(),
});

/** Starts a stage. Portrait and voice finish inline; avatar returns a job to poll. */
export const submitTestimonialJob = createServerFn({ method: "POST" })
  .validator(submitInput)
  .handler(({ data }): Promise<FnResult<JobCheck>> =>
    guarded(async () => {
      try {
        switch (data.stage) {
          case "portrait":
            return { status: "completed", jobId: "done:portrait", url: await runPortraitStage(data.entryId) };
          case "voice":
            return { status: "completed", jobId: "done:voice", url: await runVoiceStage(data.entryId) };
          case "avatar": {
            if (!data.audioSeconds) throw new PipelineError("The recording length is missing.");
            const jobId = await startAvatarStage(data.entryId, data.audioSeconds);
            return { status: "processing", jobId, progress: null, label: "Animating the portrait" };
          }
        }
      } catch (error) {
        const message = error instanceof PipelineError ? error.userMessage : "Something went wrong. Please try again.";
        await markFailed(data.entryId, message).catch(() => undefined);
        throw error;
      }
    }),
  );

export const checkTestimonialJob = createServerFn({ method: "POST" })
  .validator(z.object({ entryId: z.string().uuid(), stage: z.enum(STAGES), jobId: z.string().min(1) }))
  .handler(({ data }): Promise<FnResult<JobCheck>> =>
    guarded(async () => {
      if (data.jobId.startsWith("done:")) {
        const entry = await getEntry(data.entryId);
        const url = data.stage === "portrait" ? entry.portrait_url : entry.audio_url;
        if (!url) throw new PipelineError("This stage has not produced a file yet.");
        return { status: "completed", jobId: data.jobId, url };
      }
      return checkAvatarStage(data.entryId, data.jobId);
    }),
  );

export const getTestimonialJobResult = createServerFn({ method: "POST" })
  .validator(z.object({ entryId: z.string().uuid() }))
  .handler(({ data }): Promise<FnResult<TestimonialEntry>> => guarded(() => getEntry(data.entryId)));

export const failTestimonialEntry = createServerFn({ method: "POST" })
  .validator(z.object({ entryId: z.string().uuid(), message: z.string().max(1000) }))
  .handler(({ data }): Promise<FnResult<null>> =>
    guarded(async () => {
      await markFailed(data.entryId, data.message);
      return null;
    }),
  );

export const listGalleryEntries = createServerFn({ method: "GET" }).handler(
  (): Promise<FnResult<TestimonialEntry[]>> => guarded(() => listCompletedEntries(60)),
);

export const listAdminEntries = createServerFn({ method: "GET" }).handler(
  (): Promise<FnResult<TestimonialEntry[]>> => guarded(() => listAllEntries(200)),
);

export interface AdminUsage { summary: UsageSummaryRow[]; events: AiUsageEvent[] }

export const listAdminUsage = createServerFn({ method: "GET" }).handler(
  (): Promise<FnResult<AdminUsage>> => guarded(async () => ({ summary: await summarizeUsage(), events: await listUsageEvents(300) })),
);
