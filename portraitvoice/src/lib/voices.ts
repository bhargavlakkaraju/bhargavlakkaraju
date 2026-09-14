import type { VoiceGender } from "./types";
import { LANGUAGE_CODES } from "./languages";
export interface StandardVoice {
  id: string;
  name: string;
  gender: VoiceGender;
}
// HeyGen catalog IDs, confirmed against its ElevenLabs voice catalog.
// Kanika and Manu are Indian multilingual voices. Hindi uses native Devanagari.
const VOICES: Record<VoiceGender, StandardVoice> = {
  female: {
    id: "ebb41c845de849d2b101bd56ea9773af",
    name: "Kanika",
    gender: "female",
  },
  male: {
    id: "1dd92b1106f8428fa8e70a7dadbaf465",
    name: "Manu",
    gender: "male",
  },
};
export function pickStandardVoice(
  language: string,
  gender: VoiceGender,
): StandardVoice {
  if (!LANGUAGE_CODES.includes(language))
    throw new Error("Please choose a supported language.");
  return VOICES[gender];
}
