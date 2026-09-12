import type { Gender, LanguageCode } from "./types";

export interface VoiceChoice { id: string; name: string }

/**
 * Standard ElevenLabs premade voices matched by gender. eleven_v3 speaks every supported
 * language from the same voice. Override with ELEVENLABS_VOICE_FEMALE / ELEVENLABS_VOICE_MALE or
 * per language with ELEVENLABS_VOICE_<LANG>_<GENDER>, e.g. ELEVENLABS_VOICE_HI_FEMALE.
 */
const DEFAULT_VOICES: Record<Gender, VoiceChoice> = {
  female: { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  male: { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
};

export function pickVoice(language: LanguageCode, gender: Gender, env: Record<string, string | undefined>): VoiceChoice {
  const perLanguage = env[`ELEVENLABS_VOICE_${language.toUpperCase()}_${gender.toUpperCase()}`];
  if (perLanguage) return { id: perLanguage, name: `${language}-${gender}` };
  const perGender = env[`ELEVENLABS_VOICE_${gender.toUpperCase()}`];
  if (perGender) return { id: perGender, name: `custom-${gender}` };
  return DEFAULT_VOICES[gender];
}
