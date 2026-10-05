import { cloudStorageEnabled } from "@/lib/cloud-store";
import {
  prepareCloudUpload,
  readCloudUpload,
  cleanCloudUpload,
} from "@/lib/cloud-upload";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRepository, isSupabaseConfigured, summarizeUsage } from "@/lib/db";
import { env } from "@/lib/env";
import { LANGUAGE_CODES } from "@/lib/languages";
import {
  checkStageJob,
  resumeGeneration,
  extractNoteText as extractNoteTextService,
  resolveStageJob,
  submitAvatarStage,
  submitPortraitStage,
  submitVoiceStage,
  toFriendlyError,
  uploadAudioFile,
  uploadImageFile,
} from "@/lib/pipeline/service";
import { MAX_SCRIPT_CHARS } from "@/lib/pipeline/voice";

/**
 * Server functions. They validate input, call the pipeline service and always
 * surface a user-friendly message (never a raw stack trace) on failure.
 */

function friendly(err: unknown): never {
  const e = toFriendlyError(err);
  console.error(
    "[portraitvoice]",
    e.message,
    err instanceof Error
      ? {
          type: err.name,
          detail: err.message
            .replace(/https?:\/\/\S+/g, "[remote URL]")
            .replace(
              /(?:Bearer\s+|vercel_blob_rw_|hf_)[A-Za-z0-9_.-]+/g,
              "[credential]",
            ),
          code: (err.cause as { code?: string } | undefined)?.code,
          frame: err.stack
            ?.split("\n")
            .find((line) => line.trim().startsWith("at ")),
        }
      : {},
  );
  throw new Error(e.friendly);
}

function requireFormData(data: unknown): FormData {
  if (!(data instanceof FormData))
    throw new Error("Expected multipart form data");
  return data;
}

async function requireFile(form: FormData, key: string): Promise<File> {
  const receipt = form.get("cloudReceipt");
  if (typeof receipt === "string")
    return readCloudUpload(
      receipt,
      form.get("kind") === "audio" ? "audio" : "image",
    );
  const file = form.get(key);
  if (!(file instanceof File) || file.size === 0)
    throw new Error(`Missing file "${key}"`);
  return file;
}

export const uploadMedia = createServerFn({ method: "POST" })
  .validator(requireFormData)
  .handler(async ({ data }) => {
    try {
      const kind = data.get("kind") === "audio" ? "audio" : "image";
      const file = await requireFile(data, "file");
      const result =
        kind === "audio"
          ? await uploadAudioFile(file)
          : await uploadImageFile(file);
      if (typeof data.get("cloudReceipt") === "string")
        await cleanCloudUpload(String(data.get("cloudReceipt")));
      return result;
    } catch (err) {
      return friendly(err);
    }
  });

export const extractNoteText = createServerFn({ method: "POST" })
  .validator(requireFormData)
  .handler(async ({ data }) => {
    try {
      const result = await extractNoteTextService(
        await requireFile(data, "file"),
        String(data.get("language") || "hi"),
      );
      if (typeof data.get("cloudReceipt") === "string")
        await cleanCloudUpload(String(data.get("cloudReceipt")));
      return result;
    } catch (err) {
      return friendly(err);
    }
  });

const languageSchema = z
  .string()
  .refine((v) => LANGUAGE_CODES.includes(v), "Unsupported language");

const submitSchema = z.discriminatedUnion("stage", [
  z.object({
    stage: z.literal("portrait"),
    sourcePortraitId: z.uuid(),
    sourcePortraitUrl: z.url(),
    inputMode: z.enum(["text", "note", "audio"]),
    language: languageSchema,
    gender: z.enum(["female", "male"]).nullable(),
    scriptText: z.string().trim().max(MAX_SCRIPT_CHARS).nullable(),
    audioUrl: z.url().nullable(),
    extraction: z
      .object({ entryId: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) })
      .nullable(),
    consent: z.literal(true),
    ambience: z.boolean().default(false),
    requestId: z.uuid(),
    token: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({
    stage: z.literal("voice"),
    entryId: z.uuid(),
    token: z.string().length(64),
  }),
  z.object({
    stage: z.literal("avatar"),
    entryId: z.uuid(),
    token: z.string().length(64),
    audioDurationSec: z.number().nonnegative().max(180),
  }),
]);

export const submitTestimonialJob = createServerFn({ method: "POST" })
  .validator(submitSchema)
  .handler(async ({ data }) => {
    try {
      if (data.stage === "portrait") return await submitPortraitStage(data);
      if (data.stage === "voice")
        return await submitVoiceStage(data.entryId, data.token);
      return await submitAvatarStage(
        data.entryId,
        data.audioDurationSec,
        data.token,
      );
    } catch (err) {
      return friendly(err);
    }
  });

const checkSchema = z.object({
  entryId: z.uuid(),
  token: z.string().length(64),
  stage: z.enum(["portrait", "voice", "avatar"]),
  jobId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  audioDurationSec: z.number().nonnegative().max(180).nullable(),
});

export const checkTestimonialJob = createServerFn({ method: "POST" })
  .validator(checkSchema)
  .handler(async ({ data }) => {
    try {
      return await checkStageJob(
        data.entryId,
        data.stage,
        data.jobId,
        data.audioDurationSec,
        data.token,
      );
    } catch (err) {
      return friendly(err);
    }
  });

const resultSchema = z.object({
  entryId: z.uuid(),
  token: z.string().length(64),
  stage: z.enum(["portrait", "voice", "avatar"]),
  jobId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
});

export const getTestimonialJobResult = createServerFn({ method: "POST" })
  .validator(resultSchema)
  .handler(async ({ data }) => {
    try {
      return await resolveStageJob(
        data.entryId,
        data.stage,
        data.jobId,
        data.token,
      );
    } catch (err) {
      return friendly(err);
    }
  });

export const listGalleryEntries = createServerFn({ method: "GET" }).handler(
  async () => {
    return getRepository().listCompletedEntries(120);
  },
);

export const listAdminEntries = createServerFn({ method: "GET" }).handler(
  async () => {
    const entries = await getRepository().listEntries(300);
    return {
      entries,
      storage: isSupabaseConfigured()
        ? "supabase"
        : cloudStorageEnabled()
          ? "cloud"
          : "local-json",
    };
  },
);

export const listUsage = createServerFn({ method: "GET" }).handler(async () => {
  const events = [] as Awaited<
    ReturnType<ReturnType<typeof getRepository>["listUsage"]>
  >;
  for (let offset = 0; ; offset += 1000) {
    const page = await getRepository().listUsage(1000, offset);
    events.push(...page);
    if (page.length < 1000) break;
  }
  const summary = summarizeUsage(events);

  return {
    events: events.slice(0, 200),
    summary,
    totalEvents: events.length,
    engine: env.AVATAR_ENGINE,
    resolution: env.AVATAR_RESOLUTION,
    storage: isSupabaseConfigured()
      ? "supabase"
      : cloudStorageEnabled()
        ? "cloud"
        : "local-json",
  };
});

export const resumeTestimonial = createServerFn({ method: "POST" })
  .validator(z.object({ entryId: z.uuid(), token: z.string().length(64) }))
  .handler(async ({ data }) => {
    try {
      return await resumeGeneration(data.entryId, data.token);
    } catch (error) {
      return friendly(error);
    }
  });

export const moreAdminEntries = createServerFn({ method: "GET" })
  .validator(z.object({ offset: z.number().int().nonnegative() }))
  .handler(async ({ data }) => getRepository().listEntries(300, data.offset));

export const prepareMediaUpload = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1).max(300),
      size: z
        .number()
        .positive()
        .max(30 * 1024 * 1024),
      contentType: z.string().max(100),
      kind: z.enum(["image", "audio"]),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await prepareCloudUpload(data);
    } catch (error) {
      return friendly(error);
    }
  });

export const translateScript = createServerFn({ method: "POST" })
  .validator(
    z.object({
      text: z.string().trim().min(1).max(700),
      sourceLanguage: z.string().min(1).max(80),
      target: languageSchema,
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await (
        await import("@/lib/pipeline/translation")
      ).prepareTranslation(data.text, data.sourceLanguage, data.target);
    } catch {
      throw new Error(
        "Translation could not be prepared. Your original words are saved. Try again or enter the translation yourself.",
      );
    }
  });
export const transcribeAudio = createServerFn({ method: "POST" })
  .validator(requireFormData)
  .handler(async ({ data }) => {
    try {
      const result = await (
        await import("@/lib/pipeline/translation")
      ).transcribeRecording(
        await requireFile(data, "file"),
        String(data.get("sourceLanguage") || "auto"),
      );
      if (typeof data.get("cloudReceipt") === "string")
        await cleanCloudUpload(String(data.get("cloudReceipt")));
      return result;
    } catch {
      throw new Error(
        "The recording could not be transcribed. Try again or type the transcript yourself.",
      );
    }
  });
const batchSchema = z
  .object({
    batchId: z.uuid(),
    sourceLanguage: z.string().min(1).max(80),
    sourceScript: z.string().max(10000),
    sourcePortraitId: z.uuid(),
    sourcePortraitUrl: z.url(),
    audioUrl: z.url().nullable(),
    gender: z.enum(["female", "male"]),
    consent: z.literal(true),
    ambience: z.boolean(),
    outputs: z
      .array(
        z.object({
          language: languageSchema,
          text: z.string().trim().min(1).max(700),
          originalAudio: z.boolean(),
          requestId: z.uuid(),
          token: z.string().regex(/^[a-f0-9]{64}$/),
        }),
      )
      .min(1)
      .max(11),
  })
  .refine(
    (v) => new Set(v.outputs.map((o) => o.language)).size === v.outputs.length,
    "Choose each language once",
  );
export const createLanguageBatch = createServerFn({ method: "POST" })
  .validator(batchSchema)
  .handler(async ({ data }) => {
    const results = [];
    for (const output of data.outputs) {
      try {
        const job = await submitPortraitStage({
          ...data,
          ...output,
          inputMode: output.originalAudio ? "audio" : "text",
          scriptText: output.text,
          extraction: null,
        });
        results.push({
          language: output.language,
          entryId: job.entryId,
          token: output.token,
          error: null,
        });
      } catch (error) {
        results.push({
          language: output.language,
          entryId: null,
          token: output.token,
          error: toFriendlyError(error).friendly,
        });
      }
    }
    return results;
  });
export const retryLanguageVideo = createServerFn({ method: "POST" })
  .validator(
    z.object({ entryId: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) }),
  )
  .handler(async ({ data }) => {
    try {
      return await (
        await import("@/lib/pipeline/service")
      ).retryFailedVideo(data.entryId, data.token);
    } catch (error) {
      return friendly(error);
    }
  });
export const prepareVideoTranslation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sourceId: z.uuid(),
      sourceToken: z.string().regex(/^[a-f0-9]{64}$/),
      language: languageSchema,
      requestId: z.uuid(),
      token: z.string().regex(/^[a-f0-9]{64}$/),
      consent: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await (
        await import("@/lib/pipeline/service")
      ).prepareExistingVideoTranslation(data);
    } catch (error) {
      return friendly(error);
    }
  });
export const readVideoTranslation = createServerFn({ method: "POST" })
  .validator(
    z.object({ entryId: z.uuid(), token: z.string().regex(/^[a-f0-9]{64}$/) }),
  )
  .handler(async ({ data }) => {
    try {
      return await (
        await import("@/lib/pipeline/service")
      ).readExistingVideoTranslation(data.entryId, data.token);
    } catch (error) {
      return friendly(error);
    }
  });
export const approveVideoTranslation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      entryId: z.uuid(),
      token: z.string().regex(/^[a-f0-9]{64}$/),
      text: z.string().min(1).max(30000),
      consent: z.literal(true),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await (
        await import("@/lib/pipeline/service")
      ).reviewExistingVideoTranslation(data.entryId, data.token, data.text);
    } catch (error) {
      return friendly(error);
    }
  });
export const getTranslationCapabilities = createServerFn({
  method: "GET",
}).handler(async () =>
  (await import("@/lib/heygen")).translationCapabilities(),
);
