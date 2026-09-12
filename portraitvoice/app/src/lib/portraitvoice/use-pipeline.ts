import { useCallback, useEffect, useRef, useState } from "react";
import type { SubmitInputFor } from "@higgsfield/fnf/client";
import type { MediaRef } from "@higgsfield/fnf/media";
import { getWirePreview } from "@higgsfield/fnf-react";
import { requestGenerationApproval } from "@/lib/generation-approval";
import { uploadAsset } from "@/lib/fnf.browser";
import { PORTRAITVOICE_JOBS } from "./jobs";
import { clipSeconds, estimateSpeechSeconds, estimateStageSeconds, pickVideoEngine } from "./estimate";
import { PORTRAIT_PROMPT, talkingHeadPrompt } from "./prompts";
import {
  checkTestimonialJob,
  createTestimonialEntry,
  failTestimonialEntry,
  submitTestimonialJob,
} from "./pipeline.functions";
import type { Gender, InputMode, LanguageCode, Stage, VideoEngine } from "./types";
import { MAX_AUDIO_SECONDS } from "./types";

const POLL_MS = 6000;

type PipelineInput = SubmitInputFor<typeof PORTRAITVOICE_JOBS>;

export interface PipelineForm {
  portrait: { ref: MediaRef; url: string };
  mode: InputMode;
  language: LanguageCode;
  gender: Gender;
  scriptText: string;
  audioFile: File | null;
}

export interface RunningState {
  kind: "running";
  entryId: string | null;
  stage: Stage;
  stageLabel: string;
  startedAt: number;
  stageStartedAt: number;
  estimate: Record<Stage, number>;
  done: Stage[];
  engine: VideoEngine | null;
  portraitUrl: string | null;
}

export type PipelinePhase =
  | { kind: "idle" }
  | RunningState
  | { kind: "done"; entryId: string; videoUrl: string; portraitUrl: string | null; scriptText: string | null }
  | { kind: "failed"; message: string; entryId: string | null };

export interface StageJobRequest {
  entryId: string;
  stage: "portrait" | "avatar";
  input: PipelineInput;
}

/** Measures a recording in the browser so the clip length matches the audio. */
export function measureAudioSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const seconds = audio.duration;
      if (!Number.isFinite(seconds) || seconds <= 0) reject(new Error("Could not read the recording length."));
      else resolve(seconds);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the recording. Please upload an MP3, WAV or M4A file."));
    };
    audio.src = url;
  });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export function buildPortraitInput(portraitRef: MediaRef): PipelineInput {
  return {
    model: "nano_banana_2",
    prompt: { instruction: PORTRAIT_PROMPT },
    media: { image: [portraitRef] },
    settings: { aspectRatio: "9:16", resolution: "2k", batchSize: 1 },
  };
}

export function buildAvatarInput(args: {
  engine: VideoEngine;
  portraitJobRef: MediaRef;
  audioRef: MediaRef | null;
  seconds: number;
  mode: InputMode;
  script: string | null;
  language: LanguageCode;
  gender: Gender | null;
}): PipelineInput {
  const instruction = talkingHeadPrompt({
    mode: args.mode,
    script: args.script,
    language: args.language,
    gender: args.gender,
  });
  const duration = clipSeconds(args.engine, args.seconds);
  if (args.engine === "grok_video_v15") {
    return {
      model: "grok_video_v15",
      prompt: { instruction },
      media: {
        start_image: [args.portraitJobRef],
        ...(args.audioRef ? { audio_references: [args.audioRef] } : {}),
      },
      settings: { duration, resolution: "720p" },
    };
  }
  return {
    model: "seedance_2_5",
    prompt: { instruction },
    media: {
      image: [args.portraitJobRef],
      ...(args.audioRef ? { audio: [args.audioRef] } : {}),
    },
    settings: {
      model: "default",
      duration,
      aspectRatio: "9:16",
      resolution: "720p",
      generateAudio: true,
    },
  };
}

/** Resolves the target clip length from the input mode before anything is uploaded. */
export function plannedSeconds(form: Pick<PipelineForm, "mode" | "language" | "scriptText">, audioSeconds: number | null): number {
  if (form.mode === "audio") return audioSeconds ?? 0;
  return estimateSpeechSeconds(form.scriptText, form.language);
}

export function usePipeline() {
  const [phase, setPhase] = useState<PipelinePhase>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const reset = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setPhase({ kind: "idle" });
  }, []);

  const start = useCallback(async (form: PipelineForm) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const signal = abort.signal;
    const startedAt = Date.now();
    let entryId: string | null = null;

    const running = (patch: Partial<RunningState>) =>
      setPhase((current) => {
        const base: RunningState =
          current.kind === "running"
            ? current
            : {
                kind: "running",
                entryId,
                stage: "portrait",
                stageLabel: "Preparing",
                startedAt,
                stageStartedAt: startedAt,
                estimate: { portrait: 35, voice: 5, avatar: 120 },
                done: [],
                engine: null,
                portraitUrl: null,
              };
        return { ...base, ...patch, entryId: patch.entryId ?? base.entryId ?? entryId };
      });

    const runStage = async (request: StageJobRequest): Promise<string> => {
      const preview = getWirePreview(request.input, PORTRAITVOICE_JOBS);
      if (!preview.ok) throw new Error(preview.error.message);
      const approval = await requestGenerationApproval({
        jobSetType: preview.jobSetType,
        params: preview.params,
      });
      if (typeof approval !== "string" || approval.length === 0) throw new Error("Generation was not approved.");
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const submitted = await submitTestimonialJob({
        data: {
          entryId: request.entryId,
          stage: request.stage,
          // Plain JSON (prompt, settings, media refs) — the server rebuilds the job through the SDK.
          input: request.input as unknown as Record<string, unknown>,
          confirmationToken: approval,
        },
      });
      if (!submitted.ok) throw new Error(submitted.error.message);
      for (;;) {
        await sleep(POLL_MS, signal);
        const check = await checkTestimonialJob({ data: { entryId: request.entryId, stage: request.stage } });
        if (!check.ok) throw new Error(check.error.message);
        if (check.value.status === "completed") return check.value.url;
        if (check.value.status === "failed") throw new Error(check.value.error);
        running({ stageLabel: check.value.label });
      }
    };

    try {
      running({ stage: "portrait", stageLabel: "Uploading" });

      let audioRef: MediaRef | null = null;
      let audioUrl: string | null = null;
      let audioSeconds: number | null = null;
      if (form.mode === "audio") {
        if (!form.audioFile) throw new Error("Upload a voice recording first.");
        audioSeconds = await measureAudioSeconds(form.audioFile);
        if (audioSeconds > MAX_AUDIO_SECONDS) {
          throw new Error(`Recordings must be ${MAX_AUDIO_SECONDS} seconds or shorter. Please trim it and try again.`);
        }
        const uploaded = await uploadAsset(form.audioFile);
        if (!uploaded.ref) throw new Error("The recording upload did not return a media reference.");
        audioRef = uploaded.ref;
        audioUrl = uploaded.src;
      }

      const seconds = plannedSeconds(form, audioSeconds);
      const engine = pickVideoEngine(seconds);
      if (!engine) {
        throw new Error(`This testimonial would run about ${Math.round(seconds)} seconds. Keep it under ${MAX_AUDIO_SECONDS} seconds.`);
      }
      const clip = clipSeconds(engine, seconds);
      const estimate = estimateStageSeconds(clip);

      const created = await createTestimonialEntry({
        data: {
          inputMode: form.mode,
          language: form.language,
          gender: form.mode === "audio" ? null : form.gender,
          scriptText: form.mode === "audio" ? null : form.scriptText,
          sourcePortraitUrl: form.portrait.url,
          audioUrl,
          audioSeconds,
        },
      });
      if (!created.ok) throw new Error(created.error.message);
      entryId = created.value.id;
      running({
        entryId,
        stage: "portrait",
        stageLabel: "Approve in Higgsfield",
        stageStartedAt: Date.now(),
        estimate: { portrait: estimate.portrait, voice: 3, avatar: estimate.avatar },
        engine,
      });

      const portraitUrl = await runStage({ entryId, stage: "portrait", input: buildPortraitInput(form.portrait.ref) });
      const portraitJobId = (await checkPortraitJobId(entryId)) ?? null;
      running({ stage: "voice", stageLabel: form.mode === "audio" ? "Recording ready" : "Script locked", stageStartedAt: Date.now(), done: ["portrait"], portraitUrl });
      await sleep(1200, signal);

      running({ stage: "avatar", stageLabel: "Approve in Higgsfield", stageStartedAt: Date.now(), done: ["portrait", "voice"] });
      const portraitJobRef: MediaRef = portraitJobId
        ? { id: portraitJobId, type: "image_job", url: portraitUrl }
        : { id: portraitUrl, type: "media_input", url: portraitUrl };
      const videoUrl = await runStage({
        entryId,
        stage: "avatar",
        input: buildAvatarInput({
          engine,
          portraitJobRef,
          audioRef,
          seconds,
          mode: form.mode,
          script: form.mode === "audio" ? null : form.scriptText,
          language: form.language,
          gender: form.mode === "audio" ? null : form.gender,
        }),
      });
      setPhase({ kind: "done", entryId, videoUrl, portraitUrl, scriptText: form.mode === "audio" ? null : form.scriptText });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      if (entryId) void failTestimonialEntry({ data: { entryId, message } });
      setPhase({ kind: "failed", message, entryId });
    }
  }, []);

  return { phase, start, reset };
}

async function checkPortraitJobId(entryId: string): Promise<string | undefined> {
  const { getTestimonialJobResult } = await import("./pipeline.functions");
  const result = await getTestimonialJobResult({ data: { entryId } });
  return result.ok ? (result.value.portrait_job_id ?? undefined) : undefined;
}
