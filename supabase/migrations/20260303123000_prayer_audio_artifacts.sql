create table if not exists public.prayer_audio_artifacts (
  id uuid primary key default gen_random_uuid(),
  prayer_library_script_id uuid references public.prayer_library_scripts(id) on delete set null,
  prayer_library_item_id uuid references public.prayer_library_items(id) on delete set null,
  title text,
  duration_minutes integer check (duration_minutes > 0),
  language text not null default 'en',
  voice_id text not null,
  voice_label text,
  model_id text not null,
  cache_version text not null,
  script_hash text not null,
  script_checksum text not null,
  storage_object_path text not null,
  timings_object_path text not null,
  content_type text not null default 'audio/mpeg',
  word_timings jsonb not null default '[]'::jsonb,
  status text not null default 'ready' check (status in ('pending', 'ready', 'failed')),
  error_message text,
  generated_at timestamptz not null default timezone('utc', now()),
  last_accessed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (voice_id, model_id, cache_version, script_hash)
);

create index if not exists prayer_audio_artifacts_script_idx
on public.prayer_audio_artifacts(prayer_library_script_id, duration_minutes, language);

create index if not exists prayer_audio_artifacts_voice_status_idx
on public.prayer_audio_artifacts(voice_id, status, updated_at desc);

create index if not exists prayer_audio_artifacts_generated_idx
on public.prayer_audio_artifacts(generated_at desc);

drop trigger if exists prayer_audio_artifacts_set_updated_at on public.prayer_audio_artifacts;
create trigger prayer_audio_artifacts_set_updated_at
before update on public.prayer_audio_artifacts
for each row
execute function public.handle_updated_at();

alter table public.prayer_audio_artifacts enable row level security;
