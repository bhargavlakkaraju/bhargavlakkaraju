import type { LanguageCode, VideoEngine } from "./types";
import { GROK_MAX_SECONDS, SEEDANCE_MAX_SECONDS } from "./types";

/**
 * Rough speaking pace per language in characters per second at a calm testimonial
 * pace. Indic scripts pack more phonemes per character than Latin, so they read
 * slower per character.
 */
const CHARS_PER_SECOND: Record<LanguageCode, number> = {
  hi: 9.5,
  bn: 9,
  ta: 8.5,
  te: 8.5,
  kn: 8.5,
  mr: 9.5,
  gu: 9.5,
  pa: 9.5,
  ml: 8,
  en: 13,
};

/** Estimated spoken duration for typed text, padded with a short lead-in and tail. */
export function estimateSpeechSeconds(text: string, language: LanguageCode): number {
  const chars = text.replace(/\s+/g, " ").trim().length;
  if (chars === 0) return 0;
  return Math.ceil(chars / CHARS_PER_SECOND[language] + 1.5);
}

/**
 * Picks the talking-head engine from the target duration. Grok Video 1.5 is the
 * default animator (the Grok video skill's pick); Seedance 2.5 covers 16-30 s.
 */
export function pickVideoEngine(seconds: number): VideoEngine | null {
  if (seconds <= GROK_MAX_SECONDS) return "grok_video_v15";
  if (seconds <= SEEDANCE_MAX_SECONDS) return "seedance_2_5";
  return null;
}

export function clipSeconds(engine: VideoEngine, seconds: number): number {
  const rounded = Math.ceil(seconds);
  if (engine === "grok_video_v15") return Math.min(GROK_MAX_SECONDS, Math.max(2, rounded));
  return Math.min(SEEDANCE_MAX_SECONDS, Math.max(4, rounded));
}

export interface StageEstimate {
  portrait: number;
  avatar: number;
}

/** Wall-clock estimates (seconds) used for the progress bar and ETA. */
export function estimateStageSeconds(clip: number): StageEstimate {
  return { portrait: 35, avatar: 60 + clip * 9 };
}
