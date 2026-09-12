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

export const MAX_SCRIPT_CHARS = 700;
/** Grok Imagine Video renders 15 s per clip and extends 10 s at a time; six extensions is the ceiling we allow. */
export const GROK_CLIP_SECONDS = 15;
export const GROK_EXTENSION_SECONDS = 10;
export const MAX_AUDIO_SECONDS = 60;

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
  audio_seconds: number | null;
  current_job_id: string | null;
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type UsageStage = "portrait" | "extraction" | "voice" | "avatar" | "lipsync";

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

/** Result of polling a stage job. `jobId` changes when a stage chains provider calls. */
export type JobCheck =
  | { status: "processing"; jobId: string; progress: number | null; label: string }
  | { status: "completed"; jobId: string; url: string }
  | { status: "failed"; jobId: string; error: string };

export type FnResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

export class PipelineError extends Error {
  readonly code: string;
  readonly userMessage: string;
  constructor(userMessage: string, detail?: string, code = "pipeline") {
    super(detail ?? userMessage);
    this.name = "PipelineError";
    this.code = code;
    this.userMessage = userMessage;
  }
}
