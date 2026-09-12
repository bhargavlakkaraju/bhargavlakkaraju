-- PortraitVoice schema (Neon / Vercel Postgres). Idempotent.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS testimonial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  current_stage text CHECK (current_stage IN ('portrait', 'voice', 'avatar')),
  input_mode text NOT NULL CHECK (input_mode IN ('text', 'note', 'audio')),
  language text NOT NULL,
  voice_id text,
  voice_name text,
  voice_gender text CHECK (voice_gender IN ('female', 'male')),
  script_text text,
  source_portrait_url text,
  portrait_url text,
  audio_url text,
  motion_url text,
  video_url text,
  audio_seconds real,
  current_job_id text,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonial_entries_status_completed ON testimonial_entries (status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonial_entries_created ON testimonial_entries (created_at DESC);

DROP TRIGGER IF EXISTS trg_testimonial_entries_updated_at ON testimonial_entries;
CREATE TRIGGER trg_testimonial_entries_updated_at BEFORE UPDATE ON testimonial_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES testimonial_entries (id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('portrait', 'extraction', 'voice', 'avatar', 'lipsync')),
  units numeric NOT NULL DEFAULT 1,
  unit_type text NOT NULL,
  credits numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_entry ON ai_usage_events (entry_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_grouping ON ai_usage_events (provider, model, stage);

DROP TRIGGER IF EXISTS trg_ai_usage_events_updated_at ON ai_usage_events;
CREATE TRIGGER trg_ai_usage_events_updated_at BEFORE UPDATE ON ai_usage_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row level security. The app connects with its own server-side role (the connection string),
-- which keeps full access; public reads go through server functions. Grant read-only access
-- to an "anon" role if you expose the tables through PostgREST / Neon Data API later.
ALTER TABLE testimonial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS testimonial_entries_app_all ON testimonial_entries;
CREATE POLICY testimonial_entries_app_all ON testimonial_entries FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS testimonial_entries_public_read ON testimonial_entries;
CREATE POLICY testimonial_entries_public_read ON testimonial_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS ai_usage_events_app_all ON ai_usage_events;
CREATE POLICY ai_usage_events_app_all ON ai_usage_events FOR ALL USING (true) WITH CHECK (true);
