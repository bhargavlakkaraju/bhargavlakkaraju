export type InputMode = "text" | "note" | "audio";
export type VoiceGender = "female" | "male";
export type EntryStatus = "processing" | "completed" | "failed";
export type Stage = "portrait" | "voice" | "avatar";
export type UsageStage = Stage | "extraction" | "lipsync";

export interface TestimonialEntry {
  id: string;
  status: EntryStatus;
  current_stage: Stage | null;
  input_mode: InputMode;
  language: string;
  voice_id: string | null;
  voice_name: string | null;
  voice_gender: VoiceGender | null;
  script_text: string | null;
  source_portrait_url: string | null;
  portrait_url: string | null;
  audio_url: string | null;
  motion_url: string | null;
  video_url: string | null;
  error_message: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiUsageEvent {
  id: string;
  entry_id: string;
  provider: string;
  model: string;
  stage: UsageStage;
  units: number;
  unit_type: string;
  credits: number;
  created_at: string;
  updated_at: string;
}

export type NewEntry = Omit<
  TestimonialEntry,
  "id" | "created_at" | "updated_at"
>;
export type NewUsageEvent = Omit<
  AiUsageEvent,
  "id" | "created_at" | "updated_at"
>;
export type EntryPatch = Partial<
  Omit<TestimonialEntry, "id" | "created_at" | "updated_at">
>;

export type JobStatus = "queued" | "in_progress" | "completed" | "failed";
