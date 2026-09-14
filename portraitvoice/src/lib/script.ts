export const MAX_SCRIPT_CHARS = 700;

/** Shared by the editor and the server so errors appear before uploading. */
export function validateScript(text: string, language: string) {
  const script = text.trim().normalize("NFC");
  if (!script || script.length > MAX_SCRIPT_CHARS)
    throw new Error("Please add up to 700 characters.");
  if (language === "hi") {
    const native = (script.match(/[\u0900-\u097f]/g) ?? []).length;
    const latin = (script.match(/[a-z]/gi) ?? []).length;
    if (!native || latin > native)
      throw new Error(
        "Please write Hindi in देवनागरी, for example नमस्ते. This helps the voice pronounce Hindi naturally.",
      );
  }
  return script;
}
