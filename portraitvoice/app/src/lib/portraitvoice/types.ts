/** Shared PortraitVoice domain types (browser-safe, no SDK imports). */

export const LANGUAGE_CODES = ["hi", "bn", "ta", "te", "kn", "mr", "gu", "pa", "ml", "en"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export const LANGUAGES: ReadonlyArray<{ code: LanguageCode; label: string; native: string }> = [
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "en", label: "English", native: "English" },
];

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

export const INPUT_MODES = ["text", "note", "audio"] as const;
export type InputMode = (typeof INPUT_MODES)[number];

export const STAGES = ["portrait", "voice", "avatar"] as const;
export type Stage = (typeof STAGES)[number];

export type EntryStatus = "processing" | "completed" | "failed";

/** Video engines available through the Higgsfield SDK for the talking-head stage. */
export type VideoEngine = "grok_video_v15" | "seedance_2_5";

export const MAX_SCRIPT_CHARS = 700;
/** Grok Video 1.5 renders 2-15 s clips; Seedance 2.5 renders 4-30 s. */
export const GROK_MAX_SECONDS = 15;
export const SEEDANCE_MAX_SECONDS = 30;
export const MAX_AUDIO_SECONDS = SEEDANCE_MAX_SECONDS;

export interface TestimonialEntry {
  id: string;
  status: EntryStatus;
  current_stage: Stage | null;
  input_mode: InputMode;
  language: LanguageCode;
  voice_id: string | null;
  voice_name: string | null;
  voice_gender: Gender | null;
  script_text: string | null;
  source_portrait_url: string | null;
  portrait_url: string | null;
  audio_url: string | null;
  motion_url: string | null;
  video_url: string | null;
  video_engine: VideoEngine | null;
  audio_seconds: number | null;
  portrait_job_id: string | null;
  video_job_id: string | null;
  owner_id: string | null;
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UsageStage = "portrait" | "extraction" | "voice" | "avatar";

export interface AiUsageEvent {
  id: string;
  entry_id: string | null;
  provider: string;
  model: string;
  stage: UsageStage;
  units: number;
  unit_type: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export interface UsageSummaryRow {
  provider: string;
  model: string;
  stage: UsageStage;
  events: number;
  units: number;
  credits: number;
}

export type JobCheck =
  | { status: "processing"; label: string }
  | { status: "completed"; url: string }
  | { status: "failed"; error: string };

export interface StageSubmission {
  entryId: string;
  stage: "portrait" | "avatar";
  jobSetType: string;
  params: Record<string, unknown>;
  confirmationToken?: string;
}
