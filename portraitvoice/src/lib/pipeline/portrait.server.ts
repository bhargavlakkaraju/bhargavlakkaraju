import { getEntry, recordUsage, updateEntry } from "../services/entries.server";
import { mirrorRemote } from "../services/storage.server";
import { editPortrait, XAI_IMAGE_MODEL } from "../services/xai.server";
import { PipelineError } from "../types";

/** Stage 1: re-frame the uploaded portrait and persist the hosted result. */
export async function runPortraitStage(entryId: string): Promise<string> {
  const entry = await getEntry(entryId);
  if (entry.portrait_url) return entry.portrait_url;
  if (!entry.source_portrait_url) throw new PipelineError("Upload a portrait photo first.");
  await updateEntry(entryId, { current_stage: "portrait", status: "processing", error_message: null });
  const temporary = await editPortrait(entry.source_portrait_url);
  const hosted = await mirrorRemote(`portraits/${entryId}`, temporary, "image/png");
  await recordUsage(entryId, "portrait", 1, XAI_IMAGE_MODEL());
  await updateEntry(entryId, { portrait_url: hosted, current_stage: "voice" });
  return hosted;
}
