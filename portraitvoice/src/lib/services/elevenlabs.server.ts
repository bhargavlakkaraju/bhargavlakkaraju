import { optionalEnv, requireEnv } from "../env.server";
import { PipelineError, type Gender, type LanguageCode } from "../types";
import { pickVoice, type VoiceChoice } from "../voices";

export const TTS_MODEL = (): string => optionalEnv("ELEVENLABS_MODEL_ID", "eleven_v3");

export interface SynthesisResult { bytes: ArrayBuffer; contentType: string; voice: VoiceChoice }

/** MP3 speech via ElevenLabs. Speed 0.94 keeps a calm, rural testimonial pace. */
export async function synthesizeSpeech(text: string, language: LanguageCode, gender: Gender): Promise<SynthesisResult> {
  const key = requireEnv("ELEVENLABS_API_KEY", "The voice service");
  const voice = pickVoice(language, gender, process.env);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.id)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: TTS_MODEL(),
      language_code: language,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, speed: 0.94, use_speaker_boost: true },
    }),
  });
  if (res.status === 401 || res.status === 402) {
    throw new PipelineError("Voice credits are exhausted or the voice key is invalid. Please contact the administrator.", `${res.status}`, "balance");
  }
  if (res.status === 429) throw new PipelineError("The voice service is busy. Please try again in a minute.", "429", "rate_limit");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new PipelineError("Speech synthesis failed. Please shorten the text and try again.", `${res.status} ${detail.slice(0, 300)}`);
  }
  return { bytes: await res.arrayBuffer(), contentType: "audio/mpeg", voice };
}
