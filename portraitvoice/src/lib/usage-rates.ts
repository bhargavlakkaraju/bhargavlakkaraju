import type { UsageStage } from "./types";

export interface UsageRate {
  provider: string;
  model: string;
  unitType: "image" | "1k_chars" | "second" | "1k_tokens";
  /** Credits per unit. 1 credit = 1 US cent of list price, so admin totals read as cents. */
  creditsPerUnit: number;
}

export const USAGE_RATES: Record<UsageStage, UsageRate> = {
  portrait: { provider: "xAI", model: "grok-imagine-image-2.0", unitType: "image", creditsPerUnit: 4 },
  extraction: { provider: "xAI", model: "grok-4.6", unitType: "1k_tokens", creditsPerUnit: 0.3 },
  voice: { provider: "ElevenLabs", model: "eleven_v3", unitType: "1k_chars", creditsPerUnit: 3 },
  avatar: { provider: "xAI", model: "grok-imagine-video-1.5", unitType: "second", creditsPerUnit: 8 },
  lipsync: { provider: "sync.so", model: "lipsync-2-pro", unitType: "second", creditsPerUnit: 7.5 },
};

export function creditsFor(stage: UsageStage, units: number): number {
  return Math.round(USAGE_RATES[stage].creditsPerUnit * units * 1000) / 1000;
}
