import { createLlmClient } from "@higgsfield/fnf";
import { NOTE_OCR_PROMPT } from "./prompts";

export interface OcrResult {
  text: string;
  model: string;
  tokens: number;
}

/** Reads a handwritten note through the platform LLM rail (zero-token, server only). */
export async function extractNoteWithLlm(imageUrl: string): Promise<OcrResult> {
  const llm = createLlmClient({ baseUrl: "https://fnf.internal/llm" });
  const models = await llm.listModels();
  // Prefer a multimodal family when the gateway exposes one; otherwise the first id.
  const model =
    models.find((id) => /gemini|gpt-4o|gpt-5|claude|vision|omni/i.test(id)) ?? models[0];
  if (!model) throw new Error("No text model is available right now. Please type the testimonial instead.");
  const completion = await llm.complete({
    model,
    temperature: 0,
    maxTokens: 900,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: NOTE_OCR_PROMPT },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });
  const text = completion.content.trim();
  if (!text) throw new Error("No readable text was found. Try a brighter, closer photo of the note.");
  return {
    text,
    model,
    tokens: completion.usage.promptTokens + completion.usage.completionTokens,
  };
}
