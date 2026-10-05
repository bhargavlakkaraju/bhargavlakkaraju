export const MAX_SCRIPT_CHARS = 700;

/** Shared by the editor and the server so errors appear before uploading. */
export function validateScript(text: string, language: string) {
  const script = text.trim().normalize("NFC");
  if (!script || script.length > MAX_SCRIPT_CHARS)
    throw new Error("Please add up to 700 characters.");
  if (/\[(?:unclear|unreadable)\]/i.test(script))
    throw new Error("Please resolve unclear words before creating a video.");
  const nativePatterns: Record<string, RegExp> = {
    hi: /[\u0900-\u097f]/g,
    mr: /[\u0900-\u097f]/g,
    bn: /[\u0980-\u09ff]/g,
    pa: /[\u0a00-\u0a7f]/g,
    gu: /[\u0a80-\u0aff]/g,
    or: /[\u0b00-\u0b7f]/g,
    ta: /[\u0b80-\u0bff]/g,
    te: /[\u0c00-\u0c7f]/g,
    kn: /[\u0c80-\u0cff]/g,
    ml: /[\u0d00-\u0d7f]/g,
  };
  if (
    language !== "hi" &&
    nativePatterns[language] &&
    !(script.match(nativePatterns[language]!) ?? []).length
  )
    throw new Error(
      "Please write the selected language in its native script for natural pronunciation.",
    );
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
