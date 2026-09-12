-- PortraitVoice: testimonial entries + AI usage ledger. Additive only.
CREATE TABLE IF NOT EXISTS testimonial_entries (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  current_stage TEXT CHECK (current_stage IN ('portrait', 'voice', 'avatar')),
  input_mode TEXT NOT NULL CHECK (input_mode IN ('text', 'note', 'audio')),
  language TEXT NOT NULL,
  voice_id TEXT,
  voice_name TEXT,
  voice_gender TEXT CHECK (voice_gender IN ('female', 'male')),
  script_text TEXT,
  source_portrait_url TEXT,
  portrait_url TEXT,
  audio_url TEXT,
  motion_url TEXT,
  video_url TEXT,
  video_engine TEXT,
  audio_seconds REAL,
  portrait_job_id TEXT,
  video_job_id TEXT,
  owner_id TEXT,
  error_message TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_testimonial_entries_status_completed
  ON testimonial_entries (status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonial_entries_created
  ON testimonial_entries (created_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_testimonial_entries_updated_at
AFTER UPDATE ON testimonial_entries
FOR EACH ROW
BEGIN
  UPDATE testimonial_entries
    SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES testimonial_entries (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('portrait', 'extraction', 'voice', 'avatar')),
  units REAL NOT NULL DEFAULT 1,
  unit_type TEXT NOT NULL,
  credits REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_entry ON ai_usage_events (entry_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_grouping ON ai_usage_events (provider, model, stage);

CREATE TRIGGER IF NOT EXISTS trg_ai_usage_events_updated_at
AFTER UPDATE ON ai_usage_events
FOR EACH ROW
BEGIN
  UPDATE ai_usage_events
    SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = OLD.id;
END;
