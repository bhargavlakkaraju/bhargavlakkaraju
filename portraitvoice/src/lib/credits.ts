import type { UsageStage } from "./types";

/**
 * Provider/model labels and fallback credit rates for each billable stage.
 * Actual credits are read from Higgsfield's cost endpoint when available;
 * these rates are only used when the cost lookup fails.
 */
export interface StageBilling {
  provider: string;
  model: string;
  unitType: "image" | "char" | "second";
  /** Fallback credits per unit. */
  rate: number;
}

export const STAGE_BILLING: Record<UsageStage, StageBilling> = {
  portrait: {
    provider: "Higgsfield",
    model: "seedream_v4_5 (Seedream 4.5)",
    unitType: "image",
    rate: 1,
  },
  extraction: {
    provider: "Higgsfield",
    model: "llm_text (gpt-5 vision OCR)",
    unitType: "image",
    rate: 0,
  },
  voice: {
    provider: "Higgsfield",
    model: "text2speech_v2 (ElevenLabs)",
    unitType: "char",
    rate: 0.3 / 300,
  },
  avatar: {
    provider: "Higgsfield",
    model: "grok_video_v15 (Grok Video 1.5)",
    unitType: "second",
    rate: 4.5,
  },
  lipsync: {
    provider: "Higgsfield",
    model: "sync_so (Sync Lipsync 3)",
    unitType: "second",
    rate: 1,
  },
};

export function fallbackCredits(stage: UsageStage, units: number): number {
  return Math.round(STAGE_BILLING[stage].rate * units * 1000) / 1000;
}
