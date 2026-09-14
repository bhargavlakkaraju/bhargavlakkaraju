import { pickStandardVoice } from "../voices";
import type { VoiceGender } from "../types";
export const VOICE_MODEL = "eleven_v3";
import { validateScript } from "../script";
export { validateScript, MAX_SCRIPT_CHARS } from "../script";
export function buildVoiceJob(
  text: string,
  language: string,
  gender: VoiceGender,
) {
  return {
    script: validateScript(text, language),
    voice: pickStandardVoice(language, gender),
    voice_settings: {
      speed: 1,
      pitch: 0,
      volume: 1,
      engine_settings: {
        engine_type: "elevenlabs",
        model: VOICE_MODEL,
        stability: 0.5,
      },
    },
  };
}
