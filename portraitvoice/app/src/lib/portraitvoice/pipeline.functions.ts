import type { SubmitInputFor } from "@higgsfield/fnf/client";
import { getJobPhase, getRawUrl } from "@higgsfield/fnf/client";
import { ApiJobError } from "@higgsfield/fnf/errors";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createServerFnf, requireCurrentUser } from "@/lib/fnf.server";
import {
  getEntry,
  insertEntry,
  insertUsage,
  listAllEntries,
  listCompletedEntries,
  listUsageEvents,
  markFailed,
  summarizeUsage,
  updateEntry,
} from "./db.server";
import { extractNoteWithLlm } from "./llm.server";
import { PORTRAITVOICE_JOBS } from "./jobs";
import {
  GENDERS,
  INPUT_MODES,
  LANGUAGE_CODES,
  MAX_SCRIPT_CHARS,
  type AiUsageEvent,
  type JobCheck,
  type TestimonialEntry,
  type UsageSummaryRow,
} from "./types";

type PipelineInput = SubmitInputFor<typeof PORTRAITVOICE_JOBS>;

export type FnResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

/** Turns SDK/platform failures into calm, farmer-facing copy. Never a blank screen. */
export function friendlyError(error: unknown): { code: string; message: string } {
  if (error instanceof ApiJobError) {
    switch (error.code) {
      case "out_of_credits":
        return { code: error.code, message: "Higgsfield credits are exhausted. Top up your workspace and try again." };
      case "rate_limit":
        return { code: error.code, message: "Too many videos are rendering right now. Please wait a minute and try again." };
      case "prompt_nsfw":
      case "ip_detected":
        return { code: error.code, message: "This photo or text was blocked by content checks. Please try a different photo or wording." };
      case "confirmation_rejected":
        return { code: error.code, message: "Generation was cancelled before it started." };
      case "approval_unavailable":
        return { code: error.code, message: "Open PortraitVoice inside Higgsfield to approve generations." };
      case "media_too_large":
        return { code: error.code, message: "The file is too large. Please use a smaller photo or a shorter recording." };
      default:
        return { code: error.code, message: error.message || "Something went wrong. Please try again." };
    }
  }
  const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
  if (/403|balance|insufficient|credit/i.test(message)) {
    return { code: "balance", message: "Video credits are unavailable right now. Please contact the administrator." };
  }
  return { code: "unexpected", message };
}

async function guarded<T>(operation: () => Promise<T>): Promise<FnResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch (error) {
    console.error("[portraitvoice]", error instanceof Error ? error.message : error);
    return { ok: false, error: friendlyError(error) };
  }
}

const entryInput = z.object({
  inputMode: z.enum(INPUT_MODES),
  language: z.enum(LANGUAGE_CODES),
  gender: z.enum(GENDERS).nullable(),
  scriptText: z.string().max(MAX_SCRIPT_CHARS).nullable(),
  sourcePortraitUrl: z.string().url(),
  audioUrl: z.string().url().nullable(),
  audioSeconds: z.number().positive().max(120).nullable(),
});

export const createTestimonialEntry = createServerFn({ method: "POST" })
  .validator(entryInput)
  .handler(({ data }): Promise<FnResult<TestimonialEntry>> =>
    guarded(async () => {
      const auth = await requireCurrentUser();
      if (!auth.ok) throw new ApiJobError("unauthorized", "Sign in with Higgsfield to create a video.");
      if (data.inputMode === "audio" && !data.audioUrl) throw new Error("Upload a voice recording first.");
      if (data.inputMode !== "audio" && !data.scriptText?.trim()) throw new Error("Add the testimonial text first.");
      return insertEntry({
        id: crypto.randomUUID(),
        input_mode: data.inputMode,
        language: data.language,
        voice_gender: data.inputMode === "audio" ? null : data.gender,
        voice_name: data.inputMode === "audio" ? "uploaded recording" : `native ${data.gender ?? "neutral"} voice`,
        script_text: data.scriptText?.trim() ?? null,
        source_portrait_url: data.sourcePortraitUrl,
        audio_url: data.audioUrl,
        audio_seconds: data.audioSeconds,
        owner_id: auth.user.id,
      });
    }),
  );

const submitInput = z.object({
  entryId: z.string().uuid(),
  stage: z.enum(["portrait", "avatar"]),
  input: z.record(z.string(), z.unknown()),
  confirmationToken: z.string().min(1),
});

export interface SubmitOutcome {
  jobId: string;
  credits: number;
}

/**
 * Submits one pipeline stage to Higgsfield. The browser built the same input,
 * previewed its wire params, and collected the host approval token for them;
 * the server rebuilds the request through the SDK and forwards that token.
 */
export const submitTestimonialJob = createServerFn({ method: "POST" })
  .validator(submitInput)
  .handler(({ data }): Promise<FnResult<SubmitOutcome>> =>
    guarded(async () => {
      const auth = await requireCurrentUser();
      if (!auth.ok) throw new ApiJobError("unauthorized", "Sign in with Higgsfield to create a video.");
      const entry = await getEntry(data.entryId);
      if (entry.owner_id && entry.owner_id !== auth.user.id) throw new Error("This request belongs to another account.");
      const input = data.input as unknown as PipelineInput;
      const { jobs } = createServerFnf({ confirmationToken: data.confirmationToken });
      const cost = await jobs.cost(input).catch(() => ({ credits: 0 }));
      const { generations } = await jobs.submit(input);
      const job = generations[0];
      if (!job) throw new Error("Higgsfield did not start the job. Please try again.");
      const engine = input.model === "grok_video_v15" || input.model === "seedance_2_5" ? input.model : null;
      await updateEntry(entry.id, {
        current_stage: data.stage,
        status: "processing",
        error_message: null,
        ...(data.stage === "portrait" ? { portrait_job_id: job.id } : { video_job_id: job.id, video_engine: engine }),
      });
      await insertUsage({
        entryId: entry.id,
        provider: "Higgsfield",
        model: input.model,
        stage: data.stage,
        units: data.stage === "avatar" ? Number((input.settings as { duration?: number } | undefined)?.duration ?? 1) : 1,
        unitType: data.stage === "avatar" ? "second" : "image",
        credits: cost.credits,
      });
      return { jobId: job.id, credits: cost.credits };
    }),
  );

const checkInput = z.object({ entryId: z.string().uuid(), stage: z.enum(["portrait", "avatar"]) });

/** Polled every ~6 s by the client; persists the result the moment a stage lands. */
export const checkTestimonialJob = createServerFn({ method: "POST" })
  .validator(checkInput)
  .handler(({ data }): Promise<FnResult<JobCheck>> =>
    guarded(async () => {
      const entry = await getEntry(data.entryId);
      const jobId = data.stage === "portrait" ? entry.portrait_job_id : entry.video_job_id;
      if (!jobId) throw new Error("This stage has not been started yet.");
      if (data.stage === "portrait" && entry.portrait_url) return { status: "completed", url: entry.portrait_url };
      if (data.stage === "avatar" && entry.video_url) return { status: "completed", url: entry.video_url };
      const { jobs } = createServerFnf();
      const generation = await jobs.get(jobId);
      const phase = getJobPhase(generation);
      if (phase === "failed") {
        const reason = generation.failReason?.trim();
        const message =
          data.stage === "portrait"
            ? `The portrait could not be re-framed${reason ? ` (${reason})` : ""}. Try a clearer, front-facing photo.`
            : `The video could not be rendered${reason ? ` (${reason})` : ""}. Try again or shorten the testimonial.`;
        await markFailed(entry.id, message);
        return { status: "failed", error: message };
      }
      if (phase === "completed") {
        const url = getRawUrl(generation);
        if (!url) {
          const message = "Higgsfield finished without returning a file. Please try again.";
          await markFailed(entry.id, message);
          return { status: "failed", error: message };
        }
        if (data.stage === "portrait") {
          await updateEntry(entry.id, { portrait_url: url, current_stage: "voice" });
        } else {
          await updateEntry(entry.id, {
            video_url: url,
            status: "completed",
            completed_at: new Date().toISOString(),
            current_stage: "avatar",
          });
        }
        return { status: "completed", url };
      }
      return {
        status: "processing",
        label: generation.status === "in_progress" ? "Rendering" : "Waiting in queue",
      };
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

export const extractNoteText = createServerFn({ method: "POST" })
  .validator(z.object({ imageUrl: z.string().url() }))
  .handler(({ data }): Promise<FnResult<{ text: string }>> =>
    guarded(async () => {
      const auth = await requireCurrentUser();
      if (!auth.ok) throw new ApiJobError("unauthorized", "Sign in with Higgsfield to read a note.");
      const result = await extractNoteWithLlm(data.imageUrl);
      await insertUsage({
        entryId: null,
        provider: "Higgsfield LLM",
        model: result.model,
        stage: "extraction",
        units: result.tokens,
        unitType: "tokens",
        credits: 0,
      });
      return { text: result.text.slice(0, MAX_SCRIPT_CHARS) };
    }),
  );

export const listGalleryEntries = createServerFn({ method: "GET" }).handler(
  (): Promise<FnResult<TestimonialEntry[]>> => guarded(() => listCompletedEntries(60)),
);

export const listAdminEntries = createServerFn({ method: "GET" }).handler(
  (): Promise<FnResult<TestimonialEntry[]>> => guarded(() => listAllEntries(200)),
);

export interface AdminUsage {
  summary: UsageSummaryRow[];
  events: AiUsageEvent[];
}

export const listAdminUsage = createServerFn({ method: "GET" }).handler(
  (): Promise<FnResult<AdminUsage>> =>
    guarded(async () => ({ summary: await summarizeUsage(), events: await listUsageEvents(300) })),
);
