import { useCallback, useEffect, useRef, useState } from "react";
import { measureAudioDuration } from "./audio-duration";
import { estimateSpeechSeconds, estimateStageSeconds } from "./estimate";
import {
  checkTestimonialJob,
  createTestimonialEntry,
  failTestimonialEntry,
  submitTestimonialJob,
  uploadMedia,
} from "@/server/fns";
import { MAX_AUDIO_SECONDS, type Gender, type InputMode, type LanguageCode, type Stage } from "./types";

const POLL_MS = 6000;

export interface PipelineForm {
  portraitFile: File;
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
  portraitUrl: string | null;
}

export type PipelinePhase =
  | { kind: "idle" }
  | RunningState
  | { kind: "done"; entryId: string; videoUrl: string; portraitUrl: string | null; scriptText: string | null }
  | { kind: "failed"; message: string; entryId: string | null };

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
  });
}

export async function uploadFile(file: File, kind: "image" | "audio"): Promise<string> {
  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);
  const result = await uploadMedia({ data: form });
  if (!result.ok) throw new Error(result.error.message);
  return result.value.url;
}

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
            : { kind: "running", entryId, stage: "portrait", stageLabel: "Uploading", startedAt, stageStartedAt: startedAt, estimate: { portrait: 30, voice: 15, avatar: 150 }, done: [], portraitUrl: null };
        return { ...base, ...patch, entryId: patch.entryId ?? base.entryId ?? entryId };
      });

    const runStage = async (id: string, stage: Stage, audioSeconds?: number): Promise<string> => {
      const submitted = await submitTestimonialJob({ data: { entryId: id, stage, ...(audioSeconds ? { audioSeconds } : {}) } });
      if (!submitted.ok) throw new Error(submitted.error.message);
      let check = submitted.value;
      for (;;) {
        if (check.status === "completed") return check.url;
        if (check.status === "failed") throw new Error(check.error);
        running({ stageLabel: check.label });
        await sleep(POLL_MS, signal);
        const next = await checkTestimonialJob({ data: { entryId: id, stage, jobId: check.jobId } });
        if (!next.ok) throw new Error(next.error.message);
        check = next.value;
      }
    };

    try {
      running({ stage: "portrait", stageLabel: "Uploading your photo" });
      const sourcePortraitUrl = await uploadFile(form.portraitFile, "image");

      let audioUrl: string | null = null;
      let audioSeconds: number | null = null;
      if (form.mode === "audio") {
        if (!form.audioFile) throw new Error("Upload a voice recording first.");
        audioSeconds = await measureAudioDuration(form.audioFile);
        if (audioSeconds > MAX_AUDIO_SECONDS) throw new Error(`Recordings must be ${MAX_AUDIO_SECONDS} seconds or shorter. Please trim it and try again.`);
        running({ stageLabel: "Uploading your recording" });
        audioUrl = await uploadFile(form.audioFile, "audio");
      }
      const planned = plannedSeconds(form, audioSeconds);
      if (planned > MAX_AUDIO_SECONDS) throw new Error(`This testimonial would run about ${Math.round(planned)} seconds. Keep it under ${MAX_AUDIO_SECONDS} seconds.`);

      const created = await createTestimonialEntry({
        data: {
          inputMode: form.mode,
          language: form.language,
          gender: form.mode === "audio" ? null : form.gender,
          scriptText: form.mode === "audio" ? null : form.scriptText,
          sourcePortraitUrl,
          audioUrl,
          audioSeconds,
        },
      });
      if (!created.ok) throw new Error(created.error.message);
      entryId = created.value.id;
      const estimate: Record<Stage, number> = {
        portrait: estimateStageSeconds("portrait", planned),
        voice: form.mode === "audio" ? 3 : estimateStageSeconds("voice", planned),
        avatar: estimateStageSeconds("avatar", Math.max(planned, 5)),
      };
      running({ entryId, stage: "portrait", stageLabel: "Re-framing the portrait", stageStartedAt: Date.now(), estimate });

      const portraitUrl = await runStage(entryId, "portrait");
      running({ stage: "voice", stageLabel: form.mode === "audio" ? "Preparing the recording" : "Synthesising the voice", stageStartedAt: Date.now(), done: ["portrait"], portraitUrl });
      const hostedAudio = await runStage(entryId, "voice");
      const seconds = audioSeconds ?? (await measureAudioDuration(hostedAudio).catch(() => planned));

      running({ stage: "avatar", stageLabel: "Animating the portrait", stageStartedAt: Date.now(), done: ["portrait", "voice"] });
      const videoUrl = await runStage(entryId, "avatar", Math.min(MAX_AUDIO_SECONDS, Math.max(2, seconds)));
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
