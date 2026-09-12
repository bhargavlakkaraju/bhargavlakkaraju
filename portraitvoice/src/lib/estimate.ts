import { GROK_CLIP_SECONDS, GROK_EXTENSION_SECONDS, type LanguageCode, type Stage } from "./types";

/** Rough speaking pace (characters per second) at a calm testimonial pace. */
const CHARS_PER_SECOND: Record<LanguageCode, number> = {
  hi: 9.5, bn: 9, ta: 8.5, te: 8.5, kn: 8.5, mr: 9.5, gu: 9.5, pa: 9.5, ml: 8, en: 13,
};

export function estimateSpeechSeconds(text: string, language: LanguageCode): number {
  const chars = text.replace(/\s+/g, " ").trim().length;
  if (chars === 0) return 0;
  return Math.ceil(chars / CHARS_PER_SECOND[language] + 1.5);
}

/** Number of 10 s Grok extensions needed after the first 15 s clip. */
export function extensionsFor(seconds: number): number {
  return seconds <= GROK_CLIP_SECONDS ? 0 : Math.ceil((seconds - GROK_CLIP_SECONDS) / GROK_EXTENSION_SECONDS);
}

/** Wall-clock estimates (seconds) used for the progress bar and ETA. */
export function estimateStageSeconds(stage: Stage, audioSeconds: number): number {
  switch (stage) {
    case "portrait":
      return 30;
    case "voice":
      return 15;
    case "avatar": {
      const clip = Math.max(5, audioSeconds);
      return 40 + clip * 8 + extensionsFor(clip) * 45 + clip * 5;
    }
  }
}
