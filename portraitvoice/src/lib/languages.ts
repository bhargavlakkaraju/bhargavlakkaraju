export interface LanguageOption {
  code: string;
  label: string;
  native: string;
  /** ISO code accepted by the TTS engine's language hint, when supported. */
  ttsHint: string | null;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: "hi", label: "Hindi", native: "हिन्दी", ttsHint: "hi" },
  { code: "bn", label: "Bengali", native: "বাংলা", ttsHint: null },
  { code: "ta", label: "Tamil", native: "தமிழ்", ttsHint: "ta" },
  { code: "te", label: "Telugu", native: "తెలుగు", ttsHint: null },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", ttsHint: null },
  { code: "mr", label: "Marathi", native: "मराठी", ttsHint: null },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", ttsHint: null },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", ttsHint: null },
  { code: "ml", label: "Malayalam", native: "മലയാളം", ttsHint: null },
  { code: "en", label: "English", native: "English", ttsHint: "en" },
] as const;

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
