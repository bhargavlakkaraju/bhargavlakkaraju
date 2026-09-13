import type { JobSpec } from "./portrait";
import { OCR_SYSTEM_PROMPT, OCR_USER_PROMPT } from "./prompts";

export const OCR_MODEL = "llm_text";
export const OCR_LLM = "gpt-5";

/** Vision LLM transcription of a handwritten note (any language, original script kept). */
export function buildOcrJob(noteUploadId: string): JobSpec {
  return {
    jobSetType: OCR_MODEL,
    params: {
      model: OCR_LLM,
      system_prompt: OCR_SYSTEM_PROMPT,
      user_prompt: OCR_USER_PROMPT,
      input_images: [{ id: noteUploadId, type: "media_input" }],
    },
  };
}
