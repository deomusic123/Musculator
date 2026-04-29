create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.stimulus_vector as enum (
  'amplitud',
  'densidad',
  'fuerza_base',
  'cardio_metabolico'
);

create type public.ingestion_source as enum (
  'manual',
  'text',
  'audio',
  'vision',
  'import'
);

create type public.ingestion_status as enum (
  'received',
  'parsed',
  'validated',
  'rejected'
);

create type public.muscle_role as enum (
  'primary',
  'secondary',
  'stabilizer'
);

create type public.meal_log_status as enum (
  'draft',
  'confirmed'
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  category text not null,
  recovery_time_hours integer not null default 48 check (recovery_time_hours > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  primary_muscle_id uuid references public.muscle_groups (id),
  stimulus_vector public.stimulus_vector not null,
  is_compound boolean not null default false,
  equipment text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.exercise_muscles (
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups (id) on delete cascade,
  role public.muscle_role not null default 'secondary',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (exercise_id, muscle_group_id, role)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source public.ingestion_source not null default 'manual',
  title text not null default 'Sesion',
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid references public.exercises (id),
  raw_exercise_name text,
  source public.ingestion_source not null default 'manual',
  sequence_index integer not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  check (exercise_id is not null or raw_exercise_name is not null)
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.workout_entries (id) on delete cascade,
  set_index integer not null,
  reps integer,
  weight_kg numeric(6,2),
  duration_seconds integer,
  distance_meters numeric(6,2),
  rpe integer check (rpe between 1 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  unique (entry_id, set_index)
);

create table if not exists public.training_ingestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source public.ingestion_source not null,
  raw_input text not null,
  parsed_payload jsonb not null default '[]'::jsonb,
  status public.ingestion_status not null default 'received',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_ref text not null,
  canonical_name text not null,
  serving_unit text not null default 'g',
  calories_per_100g numeric(8,2),
  protein_per_100g numeric(8,2),
  carbs_per_100g numeric(8,2),
  fats_per_100g numeric(8,2),
  density_g_per_ml numeric(8,4),
  embedding_model text not null default 'text-embedding-3-small',
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_name, source_ref)
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source public.ingestion_source not null default 'manual',
  image_path text,
  eaten_at timestamptz not null default timezone('utc', now()),
  status public.meal_log_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_detections (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  label text not null,
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  bounding_box jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  food_id uuid references public.foods (id),
  label text not null,
  grams numeric(8,2) not null check (grams > 0),
  confidence numeric(4,3) check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create index if not exists workout_entries_session_sequence_idx
  on public.workout_entries (session_id, sequence_index);

create index if not exists workout_sets_entry_set_idx
  on public.workout_sets (entry_id, set_index);

create index if not exists training_ingestions_user_created_idx
  on public.training_ingestions (user_id, created_at desc);

create index if not exists meal_logs_user_eaten_idx
  on public.meal_logs (user_id, eaten_at desc);

create index if not exists meal_items_meal_log_idx
  on public.meal_items (meal_log_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row
execute function public.touch_updated_at();

create trigger training_ingestions_set_updated_at
before update on public.training_ingestions
for each row
execute function public.touch_updated_at();

create trigger meal_logs_set_updated_at
before update on public.meal_logs
for each row
execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_entries enable row level security;
alter table public.workout_sets enable row level security;
alter table public.training_ingestions enable row level security;
alter table public.foods enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_detections enable row level security;
alter table public.meal_items enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "catalog_read_muscle_groups"
on public.muscle_groups
for select
to authenticated
using (true);

create policy "catalog_read_exercises"
on public.exercises
for select
to authenticated
using (true);

create policy "catalog_read_exercise_muscles"
on public.exercise_muscles
for select
to authenticated
using (true);

create policy "catalog_read_foods"
on public.foods
for select
to authenticated
using (true);

create policy "workout_sessions_manage_own"
on public.workout_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "workout_entries_manage_own"
on public.workout_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions sessions
    where sessions.id = workout_entries.session_id
      and sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_sessions sessions
    where sessions.id = workout_entries.session_id
      and sessions.user_id = auth.uid()
  )
);

create policy "workout_sets_manage_own"
on public.workout_sets
for all
to authenticated
using (
  exists (
    select 1
    from public.workout_entries entries
    join public.workout_sessions sessions on sessions.id = entries.session_id
    where entries.id = workout_sets.entry_id
      and sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.workout_entries entries
    join public.workout_sessions sessions on sessions.id = entries.session_id
    where entries.id = workout_sets.entry_id
      and sessions.user_id = auth.uid()
  )
);

create policy "training_ingestions_manage_own"
on public.training_ingestions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meal_logs_manage_own"
on public.meal_logs
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "meal_detections_manage_own"
on public.meal_detections
for all
to authenticated
using (
  exists (
    select 1
    from public.meal_logs logs
    where logs.id = meal_detections.meal_log_id
      and logs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.meal_logs logs
    where logs.id = meal_detections.meal_log_id
      and logs.user_id = auth.uid()
  )
);

create policy "meal_items_manage_own"
on public.meal_items
for all
to authenticated
using (
  exists (
    select 1
    from public.meal_logs logs
    where logs.id = meal_items.meal_log_id
      and logs.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.meal_logs logs
    where logs.id = meal_items.meal_log_id
      and logs.user_id = auth.uid()
  )
);
