import { mediaInput } from "../higgsfield";
import { PORTRAIT_PROMPT } from "./prompts";

export const PORTRAIT_MODEL = "seedream_v4_5";

export interface JobSpec {
  jobSetType: string;
  params: Record<string, unknown>;
  /** Params for the cost endpoint when they differ from the create params. */
  costParams?: Record<string, unknown>;
}

/** Seedream 4.5 image edit: re-frame the uploaded photo into a 9:16 rural UGC still. */
export function buildPortraitJob(sourceUploadId: string): JobSpec {
  return {
    jobSetType: PORTRAIT_MODEL,
    params: {
      prompt: PORTRAIT_PROMPT,
      aspect_ratio: "9:16",
      quality: "basic",
      input_images: [mediaInput(sourceUploadId)],
    },
  };
}

export const PORTRAIT_ESTIMATE_SECONDS = 45;
