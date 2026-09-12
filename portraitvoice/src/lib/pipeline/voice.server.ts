import { synthesizeSpeech, TTS_MODEL } from "../services/elevenlabs.server";
import { getEntry, recordUsage, updateEntry } from "../services/entries.server";
import { uploadBytes } from "../services/storage.server";
import { PipelineError } from "../types";

/** Stage 2: synthesise the testimonial, or reuse the uploaded recording. */
export async function runVoiceStage(entryId: string): Promise<string> {
  const entry = await getEntry(entryId);
  if (entry.audio_url) {
    await updateEntry(entryId, { current_stage: "avatar" });
    return entry.audio_url;
  }
  if (entry.input_mode === "audio") throw new PipelineError("Upload a voice recording first.");
  const script = entry.script_text?.trim();
  if (!script) throw new PipelineError("Add the testimonial text first.");
  await updateEntry(entryId, { current_stage: "voice", status: "processing", error_message: null });
  const result = await synthesizeSpeech(script, entry.language, entry.voice_gender ?? "female");
  const hosted = await uploadBytes(`audio/${entryId}`, result.bytes, result.contentType);
  await recordUsage(entryId, "voice", script.length / 1000, TTS_MODEL());
  await updateEntry(entryId, {
    audio_url: hosted,
    voice_id: result.voice.id,
    voice_name: result.voice.name,
    current_stage: "avatar",
  });
  return hosted;
}
