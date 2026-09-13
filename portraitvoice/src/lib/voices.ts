import type { VoiceGender } from "./types";

/**
 * Standard preset voices on Higgsfield's Text-to-Speech V2 (ElevenLabs engine).
 * The voice is picked automatically from language + gender; the UI never exposes a picker.
 * Preset ids come from the Higgsfield voice catalogue (`list_voices`).
 */
export interface StandardVoice {
  id: string;
  name: string;
  gender: VoiceGender;
  type: "preset" | "element";
}

const FEMALE_DEFAULT: StandardVoice = {
  id: "b0f766b7-8703-4bd1-b973-f857c36837b6",
  name: "Maya",
  gender: "female",
  type: "preset",
};

const MALE_DEFAULT: StandardVoice = {
  id: "30fc8796-ceb6-4a66-b3a7-4a145ef7f346",
  name: "Arthur",
  gender: "male",
  type: "preset",
};

/** Optional per-language overrides using verified standard catalog presets. */
const OVERRIDES: Partial<
  Record<string, Partial<Record<VoiceGender, StandardVoice>>>
> = {};

export function pickStandardVoice(
  language: string,
  gender: VoiceGender,
): StandardVoice {
  const override = OVERRIDES[language]?.[gender];
  if (override) return override;
  return gender === "female" ? FEMALE_DEFAULT : MALE_DEFAULT;
}
