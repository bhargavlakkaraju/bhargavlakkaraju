import type { AvatarEngine, AvatarResolution } from "../env";
import { mediaInput } from "../higgsfield";
import type { JobSpec } from "./portrait";
import { avatarPrompt } from "./prompts";
export const MAX_SINGLE_CLIP_SECONDS = 15;
export const LIPSYNC_MODEL = "sync_so";
export function clipSecondsFor(_engine: AvatarEngine, duration: number) {
  return Math.min(8, Math.max(2, Math.ceil(duration)));
}
export interface AvatarJobInput {
  engine: AvatarEngine;
  resolution: AvatarResolution;
  portraitMediaId: string;
  audioMediaId: string | null;
  durationSec: number;
  language: string;
}
/** Grok cannot mix a start frame with audio references. The dedicated Sync pass below uses the exact speech. */
export function buildAvatarJob(input: AvatarJobInput): JobSpec {
  return {
    jobSetType: "grok_video_v15",
    params: {
      prompt: avatarPrompt(input.language),
      duration: clipSecondsFor(input.engine, input.durationSec),
      resolution: input.resolution,
      medias: [
        { role: "start_image", data: mediaInput(input.portraitMediaId) },
      ],
    },
  };
}
