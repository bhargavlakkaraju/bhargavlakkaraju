import { pickStandardVoice } from "../voices";
import type { VoiceGender } from "../types";
export const VOICE_MODEL = "eleven_v3";
export const MAX_SCRIPT_CHARS = 700;
export function validateScript(text: string, language: string) {
  const script = text.trim().normalize("NFC");
  if (!script || script.length > MAX_SCRIPT_CHARS)
    throw new Error("Please add up to 700 characters.");
  if (language === "hi") {
    const native = (script.match(/[\u0900-\u097f]/g) ?? []).length;
    const latin = (script.match(/[a-z]/gi) ?? []).length;
    if (!native || latin > native)
      throw new Error(
        "Please write Hindi in देवनागरी, for example नमस्ते. This helps the voice pronounce Hindi naturally.",
      );
  }
  return script;
}
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
