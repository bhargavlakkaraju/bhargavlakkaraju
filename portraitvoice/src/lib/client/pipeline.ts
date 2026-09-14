import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkTestimonialJob,
  extractNoteText,
  getTestimonialJobResult,
  resumeTestimonial,
  submitTestimonialJob,
  uploadMedia,
  prepareMediaUpload,
} from "@/server/fns";
import type { InputMode, Stage, TestimonialEntry, VoiceGender } from "../types";
import { measureAudioDuration } from "./audio";
export const POLL_INTERVAL_MS = 6000;
export interface GenerateInput {
  portrait: File;
  inputMode: InputMode;
  language: string;
  gender: VoiceGender | null;
  scriptText: string | null;
  audioFile: File | null;
  extraction: { entryId: string; token: string } | null;
  consent: true;
  ambience?: boolean;
}
export interface PipelineState {
  phase: "idle" | "uploading" | "running" | "done" | "error";
  stage: Stage | null;
  stageStartedAt: number | null;
  stageEstimateSeconds: number;
  startedAt: number | null;
  skipVoice: boolean;
  portraitUrl: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  entry: TestimonialEntry | null;
  error: string | null;
  statusNote: string | null;
}
const INITIAL: PipelineState = {
  phase: "idle",
  stage: null,
  stageStartedAt: null,
  stageEstimateSeconds: 0,
  startedAt: null,
  skipVoice: false,
  portraitUrl: null,
  audioUrl: null,
  videoUrl: null,
  entry: null,
  error: null,
  statusNote: null,
};
interface Saved {
  entryId: string;
  token: string;
  startedAt: number;
}
const STORAGE = "portraitvoice.active.v1";
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("cancelled"));
      return;
    }
    const abort = () => {
      clearTimeout(t);
      reject(new Error("cancelled"));
    };
    const t = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
function save(value: Saved) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(value));
  } catch {
    /* private browsing may block storage; generation still works */
  }
}
function read(): Saved | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? "null");
    if (
      v &&
      typeof v === "object" &&
      "entryId" in v &&
      "token" in v &&
      "startedAt" in v &&
      typeof v.entryId === "string" &&
      typeof v.token === "string" &&
      typeof v.startedAt === "number"
    )
      return v as Saved;
  } catch {
    /* malformed browser state */
  }
  return null;
}
export function useTestimonialPipeline() {
  const [state, setState] = useState<PipelineState>(INITIAL),
    abort = useRef<AbortController | null>(null);
  const drive = useCallback(async (saved: Saved, signal: AbortSignal) => {
    const snapshot = await resumeTestimonial({ data: saved });
    if (signal.aborted) return;
    let e = snapshot.entry;
    setState((s) => ({
      ...s,
      phase: e.status === "completed" ? "done" : "running",
      entry: e,
      startedAt: saved.startedAt,
      portraitUrl: e.portrait_url,
      audioUrl: e.audio_url,
      videoUrl: e.video_url,
      skipVoice: e.input_mode === "audio",
    }));
    if (e.status === "completed") return;
    if (e.status === "failed")
      throw new Error(
        e.error_message ?? "This generation failed. Please start a new video.",
      );
    const runStage = async (
      stage: Stage,
      initialId: string,
      estimate: number,
      audioDurationSec: number | null,
    ) => {
      let jobId = initialId;
      const since = Date.now();
      setState((s) => ({
        ...s,
        stage,
        stageStartedAt: Date.now(),
        stageEstimateSeconds: estimate,
        statusNote: null,
      }));
      while (true) {
        if (signal.aborted) throw new Error("cancelled");
        if (Date.now() - since > 30 * 60 * 1000)
          throw new Error(
            "Generation is taking longer than expected. Use Resume to check the same request without starting over.",
          );
        const check = await checkTestimonialJob({
          data: {
            entryId: saved.entryId,
            token: saved.token,
            stage,
            jobId,
            audioDurationSec,
          },
        });
        if (signal.aborted) throw new Error("cancelled");
        if (check.status === "failed")
          throw new Error(check.error ?? "Generation failed.");
        if (check.chained) {
          jobId = check.jobId;
          setState((s) => ({
            ...s,
            stageStartedAt: Date.now(),
            stageEstimateSeconds: 120,
            statusNote: "Matching every word",
          }));
        } else if (check.status === "completed") break;
        await sleep(POLL_INTERVAL_MS, signal);
      }
      if (signal.aborted) throw new Error("cancelled");
      if (stage === "avatar")
        setState((s) => ({ ...s, statusNote: "Finishing your video" }));
      return getTestimonialJobResult({
        data: { entryId: saved.entryId, token: saved.token, stage, jobId },
      });
    };
    if (!e.portrait_url) {
      const job = snapshot.jobs.find((j) => j.stage === "portrait");
      if (!job)
        throw new Error(
          "The portrait submission needs recovery. Please contact the administrator.",
        );
      const out = await runStage("portrait", job.id, 50, null);
      e = out.entry;
      setState((s) => ({ ...s, portraitUrl: out.url, entry: e }));
    }
    if (signal.aborted) return;
    let duration = snapshot.audioDuration ?? 0;
    if (e.input_mode === "audio") {
      if (!e.audio_url) throw new Error("Please upload your recording again.");
      try {
        duration = await measureAudioDuration(e.audio_url);
      } catch {
        if (!duration)
          throw new Error(
            "The recording duration could not be measured. Please resume.",
          );
      }
    }
    if (signal.aborted) return;
    setState((s) => ({
      ...s,
      stage: "avatar",
      stageStartedAt: Date.now(),
      stageEstimateSeconds: 240,
      statusNote: "Creating your voice and video",
    }));
    const avatar = await submitTestimonialJob({
      data: {
        stage: "avatar",
        entryId: e.id,
        token: saved.token,
        audioDurationSec: duration,
      },
    });
    const result = await runStage(
      "avatar",
      avatar.jobId,
      avatar.estimatedSeconds,
      duration,
    );
    if (!signal.aborted)
      setState((s) => ({
        ...s,
        phase: "done",
        stage: null,
        videoUrl: result.url,
        entry: result.entry,
        error: null,
      }));
  }, []);
  const resume = useCallback(async () => {
    const saved = read();
    if (!saved) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({
      ...INITIAL,
      phase: "running",
      stage: "portrait",
      startedAt: saved.startedAt,
    });
    try {
      await drive(saved, controller.signal);
    } catch (e) {
      if (!controller.signal.aborted)
        setState((s) => ({
          ...s,
          phase: "error",
          error: e instanceof Error ? e.message : "Please try again.",
        }));
    }
  }, [drive]);
  useEffect(() => {
    void resume();
    return () => abort.current?.abort();
  }, [resume]);
  const reset = useCallback(() => {
    abort.current?.abort();
    try {
      localStorage.removeItem(STORAGE);
    } catch {
      /* unavailable storage */
    }
    setState(INITIAL);
  }, []);
  const generate = useCallback(
    async (input: GenerateInput) => {
      if (input.consent !== true) return;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      const { signal } = controller;
      const startedAt = Date.now();
      setState({
        ...INITIAL,
        phase: "uploading",
        startedAt,
        skipVoice: input.inputMode === "audio",
      });
      try {
        const form = await mediaForm(input.portrait, "image");
        const portrait = await uploadMedia({ data: form });
        if (signal.aborted) return;
        let audioUrl: string | null = null;
        if (input.audioFile && input.inputMode === "audio") {
          const audioForm = await mediaForm(input.audioFile, "audio");
          audioUrl = (await uploadMedia({ data: audioForm })).url;
        }
        if (signal.aborted) return;
        const token = Array.from(
          crypto.getRandomValues(new Uint8Array(32)),
          (v) => v.toString(16).padStart(2, "0"),
        ).join("");
        const submitted = await submitTestimonialJob({
          data: {
            stage: "portrait",
            sourcePortraitId: portrait.id,
            sourcePortraitUrl: portrait.url,
            inputMode: input.inputMode,
            language: input.language,
            gender: input.gender,
            scriptText: input.scriptText,
            audioUrl,
            extraction: input.extraction,
            consent: true,
            ambience: input.ambience ?? false,
            requestId: crypto.randomUUID(),
            token,
          },
        });
        const saved = { entryId: submitted.entryId, token, startedAt };
        save(saved);
        if (!signal.aborted) await drive(saved, signal);
      } catch (e) {
        if (!signal.aborted)
          setState((s) => ({
            ...s,
            phase: "error",
            error:
              e instanceof Error
                ? e.message
                : "Something interrupted generation. Please try again.",
          }));
      }
    },
    [drive],
  );
  return { state, generate, reset, resume };
}
export async function extractTextFromNote(file: File, language: string) {
  const form = await mediaForm(file, "image");
  form.set("language", language);
  return extractNoteText({ data: form });
}

async function mediaForm(file: File, kind: "image" | "audio") {
  const form = new FormData();
  form.set("kind", kind);
  const upload = await prepareMediaUpload({
    data: { name: file.name, size: file.size, contentType: file.type, kind },
  });
  if (upload.cloud) {
    const response = await fetch(upload.presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": upload.contentType },
      body: file,
    });
    if (!response.ok)
      throw new Error("The upload was interrupted. Please try again.");
    form.set("cloudReceipt", upload.receipt);
  } else form.set("file", file);
  return form;
}
