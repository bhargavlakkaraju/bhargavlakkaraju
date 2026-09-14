import { buildVoiceJob } from "./voice";
import type { VoiceGender } from "../types";
export const NATURAL_MOTION =
  "A real person having a warm, informal face-to-face conversation. Their posture is relaxed and comfortably balanced, with loose shoulders and visible gentle breathing. The shoulders and upper torso make small, irregular adjustments as they speak. An occasional soft nod or slight head turn emphasizes a thought, then they settle comfortably. Include one or two subtle weight shifts during natural pauses, with small asymmetrical shoulder movement. Let movement follow the timing of the supplied speech, with moments of rest between expressions. Maintain engaged eye contact and natural blinking. Hands rest below the crop. Movements are subtle and unhurried; avoid repetitive swaying, bouncing, deep leaning, frequent nodding or large gestures. Preserve facial identity and background. Stationary interview camera.";
export function buildAvatarJob(input: {
  entryId: string;
  imageAssetId: string;
  audioAssetId?: string;
  script?: string;
  language: string;
  gender: VoiceGender | null;
}) {
  const base = {
    type: "image",
    image: { type: "asset_id", asset_id: input.imageAssetId },
    title: `PortraitVoice ${input.entryId}`,
    aspect_ratio: "9:16",
    resolution: "1080p",
    output_format: "mp4",
    fit: "contain",
    motion_prompt: NATURAL_MOTION,
    expressiveness: "medium",
  };
  if (input.audioAssetId)
    return { ...base, audio_asset_id: input.audioAssetId };
  if (!input.script || !input.gender)
    throw new Error("Please add your testimonial and choose a voice.");
  const voice = buildVoiceJob(input.script, input.language, input.gender);
  return {
    ...base,
    script: voice.script,
    voice_id: voice.voice.id,
    voice_settings: voice.voice_settings,
  };
}
