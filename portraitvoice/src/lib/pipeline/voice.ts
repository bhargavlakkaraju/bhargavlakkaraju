import type { VoiceGender } from "../types";
import { pickStandardVoice, type StandardVoice } from "../voices";
import type { JobSpec } from "./portrait";

export const VOICE_MODEL = "text2speech_v2";
export const VOICE_ENGINE = "elevenlabs";
export const MAX_SCRIPT_CHARS = 700;

export interface VoiceJob extends JobSpec {
  voice: StandardVoice;
}

/**
 * Higgsfield Text-to-Speech V2 with the ElevenLabs engine and an automatically
 * chosen standard voice. (ElevenLabs on Higgsfield does not accept speed or
 * language hints; the multilingual model detects the script's language.)
 */
export function buildVoiceJob(
  text: string,
  language: string,
  gender: VoiceGender,
): VoiceJob {
  const voice = pickStandardVoice(language, gender);
  const base = {
    prompt: text.trim().slice(0, MAX_SCRIPT_CHARS),
    voice_type: voice.type,
    voice_id: voice.id,
  };
  return {
    jobSetType: VOICE_MODEL,
    params: { ...base, model: VOICE_ENGINE },
    // The cost endpoint uses `variant` where the create endpoint uses `model`.
    costParams: { ...base, variant: VOICE_ENGINE },
    voice,
  };
}

export const VOICE_ESTIMATE_SECONDS = 20;
