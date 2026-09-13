-- PortraitVoice schema: testimonial entries + AI credit usage events.
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- testimonial_entries
-- ---------------------------------------------------------------------------
create table if not exists public.testimonial_entries (
  id                  uuid primary key default gen_random_uuid(),
  status              text not null default 'processing'
                      check (status in ('processing', 'completed', 'failed')),
  current_stage       text
                      check (current_stage is null or current_stage in ('portrait', 'voice', 'avatar')),
  input_mode          text not null
                      check (input_mode in ('text', 'note', 'audio')),
  language            text not null,
  voice_id            text,
  voice_name          text,
  voice_gender        text
                      check (voice_gender is null or voice_gender in ('female', 'male')),
  script_text         text,
  source_portrait_url text,
  portrait_url        text,
  audio_url           text,
  motion_url          text,            -- legacy, unused by the current pipeline
  video_url           text,
  error_message       text,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists testimonial_entries_created_at_idx
  on public.testimonial_entries (created_at desc);
create index if not exists testimonial_entries_status_idx
  on public.testimonial_entries (status);

drop trigger if exists testimonial_entries_set_updated_at on public.testimonial_entries;
create trigger testimonial_entries_set_updated_at
  before update on public.testimonial_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_usage_events
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage_events (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.testimonial_entries (id) on delete cascade,
  provider    text not null,
  model       text not null,
  stage       text not null
              check (stage in ('portrait', 'voice', 'avatar', 'extraction', 'lipsync')),
  units       numeric(12, 3) not null default 0,
  unit_type   text not null,
  credits     numeric(12, 4) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ai_usage_events_entry_id_idx on public.ai_usage_events (entry_id);
create index if not exists ai_usage_events_created_at_idx on public.ai_usage_events (created_at desc);

drop trigger if exists ai_usage_events_set_updated_at on public.ai_usage_events;
create trigger ai_usage_events_set_updated_at
  before update on public.ai_usage_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security + grants
-- Public (anon + authenticated) may only SELECT. All writes go through the
-- server using the service_role key.
-- ---------------------------------------------------------------------------
alter table public.testimonial_entries enable row level security;
alter table public.ai_usage_events     enable row level security;

revoke all on public.testimonial_entries from anon, authenticated;
revoke all on public.ai_usage_events     from anon, authenticated;

grant select on public.testimonial_entries to anon, authenticated;
grant select on public.ai_usage_events     to anon, authenticated;
grant all    on public.testimonial_entries to service_role;
grant all    on public.ai_usage_events     to service_role;

drop policy if exists "public read testimonial_entries" on public.testimonial_entries;
create policy "public read testimonial_entries"
  on public.testimonial_entries for select
  to anon, authenticated
  using (true);

drop policy if exists "service role full access testimonial_entries" on public.testimonial_entries;
create policy "service role full access testimonial_entries"
  on public.testimonial_entries for all
  to service_role
  using (true) with check (true);

drop policy if exists "public read ai_usage_events" on public.ai_usage_events;
create policy "public read ai_usage_events"
  on public.ai_usage_events for select
  to anon, authenticated
  using (true);

drop policy if exists "service role full access ai_usage_events" on public.ai_usage_events;
create policy "service role full access ai_usage_events"
  on public.ai_usage_events for all
  to service_role
  using (true) with check (true);
