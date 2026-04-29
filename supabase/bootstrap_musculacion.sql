-- Musculator bootstrap para Supabase SQL Editor
-- Pegar completo en el editor SQL de Supabase y ejecutar una sola vez.

create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'stimulus_vector'
  ) then
    create type public.stimulus_vector as enum (
      'amplitud',
      'densidad',
      'fuerza_base',
      'cardio_metabolico'
    );
  end if;
end
$$;

alter type public.stimulus_vector add value if not exists 'amplitud';
alter type public.stimulus_vector add value if not exists 'densidad';
alter type public.stimulus_vector add value if not exists 'fuerza_base';
alter type public.stimulus_vector add value if not exists 'cardio_metabolico';
alter type public.stimulus_vector add value if not exists 'acondicionamiento';
alter type public.stimulus_vector add value if not exists 'potencia';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'movement_pattern'
  ) then
    create type public.movement_pattern as enum (
      'horizontal_push',
      'vertical_push',
      'horizontal_pull',
      'vertical_pull',
      'knee_dominant',
      'hip_hinge',
      'core_anti_movement',
      'rotation_ballistic',
      'locomotion_metabolic'
    );
  end if;
end
$$;

alter type public.movement_pattern add value if not exists 'horizontal_push';
alter type public.movement_pattern add value if not exists 'vertical_push';
alter type public.movement_pattern add value if not exists 'horizontal_pull';
alter type public.movement_pattern add value if not exists 'vertical_pull';
alter type public.movement_pattern add value if not exists 'knee_dominant';
alter type public.movement_pattern add value if not exists 'hip_hinge';
alter type public.movement_pattern add value if not exists 'core_anti_movement';
alter type public.movement_pattern add value if not exists 'rotation_ballistic';
alter type public.movement_pattern add value if not exists 'locomotion_metabolic';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'resistance_profile'
  ) then
    create type public.resistance_profile as enum (
      'bodyweight',
      'free_weight',
      'cable',
      'machine',
      'specific'
    );
  end if;
end
$$;

alter type public.resistance_profile add value if not exists 'bodyweight';
alter type public.resistance_profile add value if not exists 'free_weight';
alter type public.resistance_profile add value if not exists 'cable';
alter type public.resistance_profile add value if not exists 'machine';
alter type public.resistance_profile add value if not exists 'specific';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'ingestion_source'
  ) then
    create type public.ingestion_source as enum (
      'manual',
      'text',
      'audio',
      'vision',
      'import'
    );
  end if;
end
$$;

alter type public.ingestion_source add value if not exists 'manual';
alter type public.ingestion_source add value if not exists 'text';
alter type public.ingestion_source add value if not exists 'audio';
alter type public.ingestion_source add value if not exists 'vision';
alter type public.ingestion_source add value if not exists 'import';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'ingestion_status'
  ) then
    create type public.ingestion_status as enum (
      'received',
      'parsed',
      'validated',
      'rejected'
    );
  end if;
end
$$;

alter type public.ingestion_status add value if not exists 'received';
alter type public.ingestion_status add value if not exists 'parsed';
alter type public.ingestion_status add value if not exists 'validated';
alter type public.ingestion_status add value if not exists 'rejected';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'muscle_role'
  ) then
    create type public.muscle_role as enum (
      'primary',
      'secondary',
      'stabilizer'
    );
  end if;
end
$$;

alter type public.muscle_role add value if not exists 'primary';
alter type public.muscle_role add value if not exists 'secondary';
alter type public.muscle_role add value if not exists 'stabilizer';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'training_session_kind'
  ) then
    create type public.training_session_kind as enum (
      'strength',
      'conditioning',
      'hybrid'
    );
  end if;
end
$$;

alter type public.training_session_kind add value if not exists 'strength';
alter type public.training_session_kind add value if not exists 'conditioning';
alter type public.training_session_kind add value if not exists 'hybrid';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'training_protocol_week_type'
  ) then
    create type public.training_protocol_week_type as enum (
      'build',
      'intensification',
      'deload',
      'test'
    );
  end if;
end
$$;

alter type public.training_protocol_week_type add value if not exists 'build';
alter type public.training_protocol_week_type add value if not exists 'intensification';
alter type public.training_protocol_week_type add value if not exists 'deload';
alter type public.training_protocol_week_type add value if not exists 'test';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'training_protocol_assignment_status'
  ) then
    create type public.training_protocol_assignment_status as enum (
      'draft',
      'active',
      'paused',
      'completed'
    );
  end if;
end
$$;

alter type public.training_protocol_assignment_status add value if not exists 'draft';
alter type public.training_protocol_assignment_status add value if not exists 'active';
alter type public.training_protocol_assignment_status add value if not exists 'paused';
alter type public.training_protocol_assignment_status add value if not exists 'completed';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, 'usuario'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  goal text,
  notes text,
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
  movement_pattern public.movement_pattern not null default 'horizontal_push',
  stimulus_vector public.stimulus_vector not null,
  resistance_profile public.resistance_profile not null default 'free_weight',
  is_compound boolean not null default false,
  equipment text,
  cns_tax_multiplier numeric(3,1) not null default 5.0 check (cns_tax_multiplier between 1 and 10),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.exercises
  add column if not exists movement_pattern public.movement_pattern not null default 'horizontal_push';

alter table public.exercises
  add column if not exists resistance_profile public.resistance_profile not null default 'free_weight';

alter table public.exercises
  add column if not exists cns_tax_multiplier numeric(3,1) not null default 5.0;

create table if not exists public.training_templates (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles (id) on delete cascade,
  code text not null unique,
  name text not null,
  description text,
  session_kind public.training_session_kind not null default 'strength',
  goal text,
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.training_template_entries (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.training_templates (id) on delete cascade,
  exercise_id uuid references public.exercises (id),
  raw_exercise_name text,
  sequence_index integer not null default 0,
  target_sets integer not null default 1 check (target_sets > 0),
  target_reps_min integer check (target_reps_min > 0),
  target_reps_max integer check (target_reps_max > 0),
  target_weight_kg numeric(8,2),
  target_duration_seconds integer check (target_duration_seconds > 0),
  target_rpe numeric(3,1) check (target_rpe between 1 and 10),
  target_stimulus_vector public.stimulus_vector,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  check (exercise_id is not null or raw_exercise_name is not null),
  check (
    target_reps_min is not null
    or target_reps_max is not null
    or target_duration_seconds is not null
  )
);

create table if not exists public.training_template_sets (
  id uuid primary key default gen_random_uuid(),
  template_entry_id uuid not null references public.training_template_entries (id) on delete cascade,
  set_index integer not null check (set_index > 0),
  target_reps_min integer check (target_reps_min > 0),
  target_reps_max integer check (target_reps_max > 0),
  target_weight_kg numeric(8,2),
  target_duration_seconds integer check (target_duration_seconds > 0),
  target_rpe numeric(3,1) check (target_rpe between 1 and 10),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (template_entry_id, set_index),
  check (
    target_reps_min is not null
    or target_reps_max is not null
    or target_duration_seconds is not null
  )
);

create table if not exists public.training_protocols (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles (id) on delete cascade,
  code text not null unique,
  name text not null,
  description text,
  goal text,
  duration_weeks integer not null check (duration_weeks > 0),
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.training_protocol_weeks (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.training_protocols (id) on delete cascade,
  week_number integer not null check (week_number > 0),
  label text not null,
  week_type public.training_protocol_week_type not null default 'build',
  load_factor numeric(4,2) not null default 1.00 check (load_factor between 0.40 and 1.80),
  rpe_offset numeric(3,1) not null default 0 check (rpe_offset between -3 and 3),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (protocol_id, week_number)
);

create table if not exists public.training_protocol_week_templates (
  id uuid primary key default gen_random_uuid(),
  protocol_week_id uuid not null references public.training_protocol_weeks (id) on delete cascade,
  template_id uuid not null references public.training_templates (id) on delete cascade,
  day_offset integer not null check (day_offset between 0 and 6),
  order_index integer not null default 0 check (order_index >= 0),
  progression_percent numeric(5,2) not null default 0,
  target_rpe_delta numeric(3,1) not null default 0 check (target_rpe_delta between -3 and 3),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (protocol_week_id, day_offset, order_index)
);

create table if not exists public.client_protocol_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  protocol_id uuid not null references public.training_protocols (id) on delete cascade,
  status public.training_protocol_assignment_status not null default 'draft',
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  active_week integer not null default 1 check (active_week > 0),
  current_day_offset integer not null default 0 check (current_day_offset between 0 and 6),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
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

alter table public.workout_sessions
  add column if not exists title text not null default 'Sesion';

alter table public.workout_sessions
  add column if not exists client_id uuid references public.clients (id) on delete set null;

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
  weight_kg numeric(8,2),
  duration_seconds integer,
  distance_meters numeric(8,2),
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

create index if not exists workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

create index if not exists clients_owner_created_idx
  on public.clients (owner_user_id, created_at desc);

create index if not exists workout_sessions_client_started_idx
  on public.workout_sessions (client_id, started_at desc);

create index if not exists workout_entries_session_sequence_idx
  on public.workout_entries (session_id, sequence_index);

create index if not exists workout_entries_exercise_idx
  on public.workout_entries (exercise_id);

create index if not exists workout_sets_entry_set_idx
  on public.workout_sets (entry_id, set_index);

create index if not exists training_ingestions_user_created_idx
  on public.training_ingestions (user_id, created_at desc);

create index if not exists exercises_primary_muscle_idx
  on public.exercises (primary_muscle_id);

create index if not exists exercises_movement_pattern_idx
  on public.exercises (movement_pattern);

create index if not exists exercises_resistance_profile_idx
  on public.exercises (resistance_profile);

create index if not exists training_templates_owner_code_idx
  on public.training_templates (owner_user_id, code);

create index if not exists training_template_entries_template_sequence_idx
  on public.training_template_entries (template_id, sequence_index);

create index if not exists training_template_sets_entry_set_idx
  on public.training_template_sets (template_entry_id, set_index);

create index if not exists training_protocols_owner_code_idx
  on public.training_protocols (owner_user_id, code);

create index if not exists training_protocol_weeks_protocol_week_idx
  on public.training_protocol_weeks (protocol_id, week_number);

create index if not exists training_protocol_week_templates_week_day_idx
  on public.training_protocol_week_templates (protocol_week_id, day_offset, order_index);

create index if not exists client_protocol_assignments_client_status_idx
  on public.client_protocol_assignments (client_id, status, starts_at desc);

create unique index if not exists client_protocol_assignments_one_active_idx
  on public.client_protocol_assignments (client_id)
  where status = 'active';

create index if not exists exercise_muscles_muscle_idx
  on public.exercise_muscles (muscle_group_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row
execute function public.touch_updated_at();

drop trigger if exists training_templates_set_updated_at on public.training_templates;
create trigger training_templates_set_updated_at
before update on public.training_templates
for each row
execute function public.touch_updated_at();

drop trigger if exists training_protocols_set_updated_at on public.training_protocols;
create trigger training_protocols_set_updated_at
before update on public.training_protocols
for each row
execute function public.touch_updated_at();

drop trigger if exists client_protocol_assignments_set_updated_at on public.client_protocol_assignments;
create trigger client_protocol_assignments_set_updated_at
before update on public.client_protocol_assignments
for each row
execute function public.touch_updated_at();

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row
execute function public.touch_updated_at();

drop trigger if exists training_ingestions_set_updated_at on public.training_ingestions;
create trigger training_ingestions_set_updated_at
before update on public.training_ingestions
for each row
execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.training_templates enable row level security;
alter table public.training_template_entries enable row level security;
alter table public.training_template_sets enable row level security;
alter table public.training_protocols enable row level security;
alter table public.training_protocol_weeks enable row level security;
alter table public.training_protocol_week_templates enable row level security;
alter table public.client_protocol_assignments enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_entries enable row level security;
alter table public.workout_sets enable row level security;
alter table public.training_ingestions enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists clients_manage_own on public.clients;
create policy clients_manage_own
on public.clients
for all
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists catalog_read_muscle_groups on public.muscle_groups;
create policy catalog_read_muscle_groups
on public.muscle_groups
for select
to anon, authenticated
using (true);

drop policy if exists catalog_read_exercises on public.exercises;
create policy catalog_read_exercises
on public.exercises
for select
to anon, authenticated
using (true);

drop policy if exists catalog_read_exercise_muscles on public.exercise_muscles;
create policy catalog_read_exercise_muscles
on public.exercise_muscles
for select
to anon, authenticated
using (true);

drop policy if exists training_templates_select_visible on public.training_templates;
create policy training_templates_select_visible
on public.training_templates
for select
to authenticated
using (is_system or auth.uid() = owner_user_id);

drop policy if exists training_templates_manage_own on public.training_templates;
create policy training_templates_manage_own
on public.training_templates
for all
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists training_template_entries_select_visible on public.training_template_entries;
create policy training_template_entries_select_visible
on public.training_template_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.training_templates templates
    where templates.id = training_template_entries.template_id
      and (templates.is_system or templates.owner_user_id = auth.uid())
  )
);

drop policy if exists training_template_entries_manage_own on public.training_template_entries;
create policy training_template_entries_manage_own
on public.training_template_entries
for all
to authenticated
using (
  exists (
    select 1
    from public.training_templates templates
    where templates.id = training_template_entries.template_id
      and templates.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.training_templates templates
    where templates.id = training_template_entries.template_id
      and templates.owner_user_id = auth.uid()
  )
);

drop policy if exists training_template_sets_select_visible on public.training_template_sets;
create policy training_template_sets_select_visible
on public.training_template_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.training_template_entries entries
    join public.training_templates templates on templates.id = entries.template_id
    where entries.id = training_template_sets.template_entry_id
      and (templates.is_system or templates.owner_user_id = auth.uid())
  )
);

drop policy if exists training_template_sets_manage_own on public.training_template_sets;
create policy training_template_sets_manage_own
on public.training_template_sets
for all
to authenticated
using (
  exists (
    select 1
    from public.training_template_entries entries
    join public.training_templates templates on templates.id = entries.template_id
    where entries.id = training_template_sets.template_entry_id
      and templates.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.training_template_entries entries
    join public.training_templates templates on templates.id = entries.template_id
    where entries.id = training_template_sets.template_entry_id
      and templates.owner_user_id = auth.uid()
  )
);

drop policy if exists training_protocols_select_visible on public.training_protocols;
create policy training_protocols_select_visible
on public.training_protocols
for select
to authenticated
using (is_system or auth.uid() = owner_user_id);

drop policy if exists training_protocols_manage_own on public.training_protocols;
create policy training_protocols_manage_own
on public.training_protocols
for all
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists training_protocol_weeks_select_visible on public.training_protocol_weeks;
create policy training_protocol_weeks_select_visible
on public.training_protocol_weeks
for select
to authenticated
using (
  exists (
    select 1
    from public.training_protocols protocols
    where protocols.id = training_protocol_weeks.protocol_id
      and (protocols.is_system or protocols.owner_user_id = auth.uid())
  )
);

drop policy if exists training_protocol_weeks_manage_own on public.training_protocol_weeks;
create policy training_protocol_weeks_manage_own
on public.training_protocol_weeks
for all
to authenticated
using (
  exists (
    select 1
    from public.training_protocols protocols
    where protocols.id = training_protocol_weeks.protocol_id
      and protocols.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.training_protocols protocols
    where protocols.id = training_protocol_weeks.protocol_id
      and protocols.owner_user_id = auth.uid()
  )
);

drop policy if exists training_protocol_week_templates_select_visible on public.training_protocol_week_templates;
create policy training_protocol_week_templates_select_visible
on public.training_protocol_week_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.training_protocol_weeks weeks
    join public.training_protocols protocols on protocols.id = weeks.protocol_id
    where weeks.id = training_protocol_week_templates.protocol_week_id
      and (protocols.is_system or protocols.owner_user_id = auth.uid())
  )
);

drop policy if exists training_protocol_week_templates_manage_own on public.training_protocol_week_templates;
create policy training_protocol_week_templates_manage_own
on public.training_protocol_week_templates
for all
to authenticated
using (
  exists (
    select 1
    from public.training_protocol_weeks weeks
    join public.training_protocols protocols on protocols.id = weeks.protocol_id
    where weeks.id = training_protocol_week_templates.protocol_week_id
      and protocols.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.training_protocol_weeks weeks
    join public.training_protocols protocols on protocols.id = weeks.protocol_id
    where weeks.id = training_protocol_week_templates.protocol_week_id
      and protocols.owner_user_id = auth.uid()
  )
);

drop policy if exists client_protocol_assignments_manage_own on public.client_protocol_assignments;
create policy client_protocol_assignments_manage_own
on public.client_protocol_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.clients clients
    where clients.id = client_protocol_assignments.client_id
      and clients.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.clients clients
    where clients.id = client_protocol_assignments.client_id
      and clients.owner_user_id = auth.uid()
  )
);

drop policy if exists workout_sessions_manage_own on public.workout_sessions;
create policy workout_sessions_manage_own
on public.workout_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists workout_entries_manage_own on public.workout_entries;
create policy workout_entries_manage_own
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

drop policy if exists workout_sets_manage_own on public.workout_sets;
create policy workout_sets_manage_own
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

drop policy if exists training_ingestions_manage_own on public.training_ingestions;
create policy training_ingestions_manage_own
on public.training_ingestions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

with muscle_seed as (
  select *
  from (
    values
      ('dorsal', 'Dorsal', 'Espalda', 72),
      ('trapecio', 'Trapecio', 'Espalda', 48),
      ('deltoides-anterior', 'Deltoides anterior', 'Hombro', 48),
      ('deltoides-lateral', 'Deltoides lateral', 'Hombro', 48),
      ('pectoral', 'Pectoral', 'Pecho', 72),
      ('biceps', 'Biceps', 'Brazo', 48),
      ('triceps', 'Triceps', 'Brazo', 48),
      ('cuadriceps', 'Cuadriceps', 'Pierna', 72),
      ('femoral', 'Femoral', 'Pierna', 72),
      ('gluteo', 'Gluteo', 'Pierna', 72),
      ('core', 'Core', 'Core', 36),
      ('pantorrilla', 'Pantorrilla', 'Pierna', 48)
  ) as seed(slug, name, category, recovery_time_hours)
)
insert into public.muscle_groups (slug, name, category, recovery_time_hours)
select slug, name, category, recovery_time_hours
from muscle_seed
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  recovery_time_hours = excluded.recovery_time_hours;

with exercise_seed as (
  select *
  from (
    values
      ('barbell-row', 'Remo con barra', 'dorsal', 'horizontal_pull', 'densidad', 'free_weight', true, 'Barra', 7.8),
      ('lat-pulldown', 'Jalon al pecho', 'dorsal', 'vertical_pull', 'amplitud', 'cable', false, 'Polea', 5.2),
      ('incline-bench-press', 'Press inclinado', 'pectoral', 'horizontal_push', 'fuerza_base', 'free_weight', true, 'Barra', 8.4),
      ('machine-fly', 'Aperturas en maquina', 'pectoral', 'horizontal_push', 'amplitud', 'machine', false, 'Maquina', 3.8),
      ('overhead-press', 'Press militar', 'deltoides-anterior', 'vertical_push', 'fuerza_base', 'free_weight', true, 'Barra', 8.1),
      ('lateral-raise', 'Elevacion lateral', 'deltoides-lateral', 'vertical_push', 'amplitud', 'free_weight', false, 'Mancuernas', 2.9),
      ('back-squat', 'Sentadilla trasera', 'cuadriceps', 'knee_dominant', 'fuerza_base', 'free_weight', true, 'Barra', 9.4),
      ('romanian-deadlift', 'Peso muerto rumano', 'femoral', 'hip_hinge', 'amplitud', 'free_weight', true, 'Barra', 8.7),
      ('leg-press', 'Prensa inclinada', 'cuadriceps', 'knee_dominant', 'densidad', 'machine', true, 'Maquina', 6.8),
      ('hip-thrust', 'Hip thrust', 'gluteo', 'hip_hinge', 'densidad', 'free_weight', true, 'Barra', 7.1),
      ('barbell-curl', 'Curl con barra', 'biceps', 'horizontal_pull', 'amplitud', 'free_weight', false, 'Barra', 2.6),
      ('rope-pushdown', 'Pushdown en cuerda', 'triceps', 'vertical_push', 'densidad', 'cable', false, 'Polea', 2.4),
      ('heavy-bag-rounds', 'Saco de boxeo', 'core', 'locomotion_metabolic', 'acondicionamiento', 'specific', false, 'Saco', 6.1)
  ) as seed(slug, name, primary_muscle_slug, movement_pattern, stimulus_vector, resistance_profile, is_compound, equipment, cns_tax_multiplier)
)
insert into public.exercises (
  slug,
  name,
  primary_muscle_id,
  movement_pattern,
  stimulus_vector,
  resistance_profile,
  is_compound,
  equipment,
  cns_tax_multiplier
)
select
  exercise_seed.slug,
  exercise_seed.name,
  muscle_groups.id,
  exercise_seed.movement_pattern::public.movement_pattern,
  exercise_seed.stimulus_vector::public.stimulus_vector,
  exercise_seed.resistance_profile::public.resistance_profile,
  exercise_seed.is_compound,
  exercise_seed.equipment,
  exercise_seed.cns_tax_multiplier
from exercise_seed
join public.muscle_groups
  on muscle_groups.slug = exercise_seed.primary_muscle_slug
on conflict (slug) do update
set
  name = excluded.name,
  primary_muscle_id = excluded.primary_muscle_id,
  movement_pattern = excluded.movement_pattern,
  stimulus_vector = excluded.stimulus_vector,
  resistance_profile = excluded.resistance_profile,
  is_compound = excluded.is_compound,
  equipment = excluded.equipment,
  cns_tax_multiplier = excluded.cns_tax_multiplier;

with exercise_muscle_seed as (
  select *
  from (
    values
      ('barbell-row', 'dorsal', 'primary'),
      ('barbell-row', 'trapecio', 'secondary'),
      ('barbell-row', 'biceps', 'secondary'),
      ('lat-pulldown', 'dorsal', 'primary'),
      ('lat-pulldown', 'biceps', 'secondary'),
      ('incline-bench-press', 'pectoral', 'primary'),
      ('incline-bench-press', 'deltoides-anterior', 'secondary'),
      ('incline-bench-press', 'triceps', 'secondary'),
      ('machine-fly', 'pectoral', 'primary'),
      ('machine-fly', 'deltoides-anterior', 'secondary'),
      ('overhead-press', 'deltoides-anterior', 'primary'),
      ('overhead-press', 'triceps', 'secondary'),
      ('overhead-press', 'core', 'stabilizer'),
      ('lateral-raise', 'deltoides-lateral', 'primary'),
      ('lateral-raise', 'trapecio', 'secondary'),
      ('back-squat', 'cuadriceps', 'primary'),
      ('back-squat', 'gluteo', 'secondary'),
      ('back-squat', 'core', 'stabilizer'),
      ('romanian-deadlift', 'femoral', 'primary'),
      ('romanian-deadlift', 'gluteo', 'secondary'),
      ('romanian-deadlift', 'core', 'stabilizer'),
      ('leg-press', 'cuadriceps', 'primary'),
      ('leg-press', 'gluteo', 'secondary'),
      ('hip-thrust', 'gluteo', 'primary'),
      ('hip-thrust', 'femoral', 'secondary'),
      ('hip-thrust', 'core', 'stabilizer'),
      ('barbell-curl', 'biceps', 'primary'),
      ('rope-pushdown', 'triceps', 'primary'),
      ('heavy-bag-rounds', 'core', 'primary'),
      ('heavy-bag-rounds', 'deltoides-anterior', 'secondary'),
      ('heavy-bag-rounds', 'pectoral', 'secondary')
  ) as seed(exercise_slug, muscle_slug, role)
)
insert into public.exercise_muscles (exercise_id, muscle_group_id, role)
select
  exercises.id,
  muscle_groups.id,
  exercise_muscle_seed.role::public.muscle_role
from exercise_muscle_seed
join public.exercises
  on exercises.slug = exercise_muscle_seed.exercise_slug
join public.muscle_groups
  on muscle_groups.slug = exercise_muscle_seed.muscle_slug
on conflict (exercise_id, muscle_group_id, role) do nothing;

with template_seed as (
  select *
  from (
    values
      ('pull-density', 'Pull densidad', 'Espalda pesada con mucho tonelaje y trabajo accesorio de biceps.', 'strength', 'densidad y traccion horizontal', true),
      ('push-hypertrophy', 'Push hipertrofia', 'Pecho y hombro con mezcla de fuerza base y trabajo de amplitud.', 'strength', 'empuje y volumen de torso', true),
      ('legs-strength', 'Legs fuerza', 'Pierna dominante en cuadriceps y cadena posterior.', 'strength', 'fuerza base y cadena posterior', true),
      ('boxing-cardio', 'Boxing cardio', 'Rounds metabolicos con foco en capacidad de trabajo y descarga neural de fuerza estricta.', 'conditioning', 'acondicionamiento y rounds de saco', true)
  ) as seed(code, name, description, session_kind, goal, is_system)
)
insert into public.training_templates (code, name, description, session_kind, goal, is_system)
select
  template_seed.code,
  template_seed.name,
  template_seed.description,
  template_seed.session_kind::public.training_session_kind,
  template_seed.goal,
  template_seed.is_system
from template_seed
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  session_kind = excluded.session_kind,
  goal = excluded.goal,
  is_system = excluded.is_system;

with template_entry_seed as (
  select *
  from (
    values
      ('pull-density', 'barbell-row', null, 0, 4, 10, 10, 72.50, null, 8.0, 'densidad', 'Back-off pesado para dorsal y trapecio.'),
      ('pull-density', 'lat-pulldown', null, 1, 3, 12, 12, 55.00, null, 8.0, 'amplitud', 'Compensa con amplitud y rango completo.'),
      ('pull-density', 'barbell-curl', null, 2, 3, 12, 12, 30.00, null, 8.0, 'amplitud', 'Cierra con accesorio de biceps.'),
      ('push-hypertrophy', 'incline-bench-press', null, 0, 3, 8, 8, 70.00, null, 8.0, 'fuerza_base', null),
      ('push-hypertrophy', 'machine-fly', null, 1, 3, 15, 15, 40.00, null, 8.0, 'amplitud', null),
      ('push-hypertrophy', 'lateral-raise', null, 2, 3, 15, 15, 10.00, null, 8.0, 'amplitud', null),
      ('push-hypertrophy', 'rope-pushdown', null, 3, 3, 15, 15, 25.00, null, 8.0, 'densidad', null),
      ('legs-strength', 'back-squat', null, 0, 3, 6, 6, 110.00, null, 8.0, 'fuerza_base', null),
      ('legs-strength', 'romanian-deadlift', null, 1, 3, 8, 8, 90.00, null, 8.0, 'densidad', null),
      ('legs-strength', 'leg-press', null, 2, 3, 12, 12, 220.00, null, 8.0, 'densidad', null),
      ('legs-strength', 'hip-thrust', null, 3, 3, 10, 10, 120.00, null, 8.0, 'densidad', null),
      ('boxing-cardio', 'heavy-bag-rounds', null, 0, 5, null, null, null, 180, 8.0, 'acondicionamiento', '5 rounds de 3 minutos con 60 segundos de pausa.' )
  ) as seed(template_code, exercise_slug, raw_exercise_name, sequence_index, target_sets, target_reps_min, target_reps_max, target_weight_kg, target_duration_seconds, target_rpe, target_stimulus_vector, notes)
)
insert into public.training_template_entries (
  template_id,
  exercise_id,
  raw_exercise_name,
  sequence_index,
  target_sets,
  target_reps_min,
  target_reps_max,
  target_weight_kg,
  target_duration_seconds,
  target_rpe,
  target_stimulus_vector,
  notes
)
select
  templates.id,
  exercises.id,
  template_entry_seed.raw_exercise_name,
  template_entry_seed.sequence_index,
  template_entry_seed.target_sets,
  template_entry_seed.target_reps_min,
  template_entry_seed.target_reps_max,
  template_entry_seed.target_weight_kg,
  template_entry_seed.target_duration_seconds,
  template_entry_seed.target_rpe,
  template_entry_seed.target_stimulus_vector::public.stimulus_vector,
  template_entry_seed.notes
from template_entry_seed
join public.training_templates templates
  on templates.code = template_entry_seed.template_code
left join public.exercises exercises
  on exercises.slug = template_entry_seed.exercise_slug
where not exists (
  select 1
  from public.training_template_entries existing
  where existing.template_id = templates.id
    and existing.sequence_index = template_entry_seed.sequence_index
);

with template_set_seed as (
  select *
  from (
    values
      ('pull-density', 0, 1, 10, 10, 72.50, null, 8.0, null),
      ('pull-density', 0, 2, 10, 10, 72.50, null, 8.0, null),
      ('pull-density', 0, 3, 8, 8, 77.50, null, 9.0, null),
      ('pull-density', 0, 4, 8, 8, 77.50, null, 9.0, null),
      ('pull-density', 1, 1, 12, 12, 55.00, null, 8.0, null),
      ('pull-density', 1, 2, 12, 12, 55.00, null, 8.0, null),
      ('pull-density', 1, 3, 10, 10, 60.00, null, 9.0, null),
      ('pull-density', 2, 1, 12, 12, 30.00, null, 8.0, null),
      ('pull-density', 2, 2, 12, 12, 30.00, null, 8.0, null),
      ('pull-density', 2, 3, 10, 10, 35.00, null, 9.0, null),
      ('push-hypertrophy', 0, 1, 8, 8, 70.00, null, 8.0, null),
      ('push-hypertrophy', 0, 2, 8, 8, 70.00, null, 8.0, null),
      ('push-hypertrophy', 0, 3, 6, 6, 75.00, null, 9.0, null),
      ('push-hypertrophy', 1, 1, 15, 15, 40.00, null, 8.0, null),
      ('push-hypertrophy', 1, 2, 12, 12, 45.00, null, 9.0, null),
      ('push-hypertrophy', 1, 3, 12, 12, 45.00, null, 9.0, null),
      ('push-hypertrophy', 2, 1, 15, 15, 10.00, null, 8.0, null),
      ('push-hypertrophy', 2, 2, 15, 15, 10.00, null, 8.0, null),
      ('push-hypertrophy', 2, 3, 12, 12, 12.00, null, 9.0, null),
      ('push-hypertrophy', 3, 1, 15, 15, 25.00, null, 8.0, null),
      ('push-hypertrophy', 3, 2, 12, 12, 30.00, null, 9.0, null),
      ('push-hypertrophy', 3, 3, 12, 12, 30.00, null, 9.0, null),
      ('legs-strength', 0, 1, 6, 6, 110.00, null, 8.0, null),
      ('legs-strength', 0, 2, 6, 6, 110.00, null, 8.0, null),
      ('legs-strength', 0, 3, 5, 5, 120.00, null, 9.0, null),
      ('legs-strength', 1, 1, 8, 8, 90.00, null, 8.0, null),
      ('legs-strength', 1, 2, 8, 8, 90.00, null, 8.0, null),
      ('legs-strength', 1, 3, 8, 8, 95.00, null, 9.0, null),
      ('legs-strength', 2, 1, 12, 12, 220.00, null, 8.0, null),
      ('legs-strength', 2, 2, 12, 12, 220.00, null, 8.0, null),
      ('legs-strength', 2, 3, 10, 10, 240.00, null, 9.0, null),
      ('legs-strength', 3, 1, 10, 10, 120.00, null, 8.0, null),
      ('legs-strength', 3, 2, 10, 10, 120.00, null, 8.0, null),
      ('legs-strength', 3, 3, 8, 8, 130.00, null, 9.0, null),
      ('boxing-cardio', 0, 1, null, null, null, 180, 8.0, 'Round tecnico'),
      ('boxing-cardio', 0, 2, null, null, null, 180, 8.0, 'Round tecnico'),
      ('boxing-cardio', 0, 3, null, null, null, 180, 9.0, 'Round medio'),
      ('boxing-cardio', 0, 4, null, null, null, 180, 9.0, 'Round medio'),
      ('boxing-cardio', 0, 5, null, null, null, 180, 9.0, 'Round final')
  ) as seed(template_code, sequence_index, set_index, target_reps_min, target_reps_max, target_weight_kg, target_duration_seconds, target_rpe, notes)
)
insert into public.training_template_sets (
  template_entry_id,
  set_index,
  target_reps_min,
  target_reps_max,
  target_weight_kg,
  target_duration_seconds,
  target_rpe,
  notes
)
select
  entries.id,
  template_set_seed.set_index,
  template_set_seed.target_reps_min,
  template_set_seed.target_reps_max,
  template_set_seed.target_weight_kg,
  template_set_seed.target_duration_seconds,
  template_set_seed.target_rpe,
  template_set_seed.notes
from template_set_seed
join public.training_templates templates
  on templates.code = template_set_seed.template_code
join public.training_template_entries entries
  on entries.template_id = templates.id
  and entries.sequence_index = template_set_seed.sequence_index
where not exists (
  select 1
  from public.training_template_sets existing
  where existing.template_entry_id = entries.id
    and existing.set_index = template_set_seed.set_index
);

insert into public.training_protocols (code, name, description, goal, duration_weeks, is_system)
values (
  'strength-density-6w',
  'Bloque Fuerza-Densidad',
  'Mesociclo de 6 semanas que mezcla fuerza estricta con rounds metabolicos sin romper recuperacion.',
  'densidad, fuerza base y acondicionamiento controlado',
  6,
  true
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  goal = excluded.goal,
  duration_weeks = excluded.duration_weeks,
  is_system = excluded.is_system;

with protocol_week_seed as (
  select *
  from (
    values
      ('strength-density-6w', 1, 'Base tecnica', 'build', 0.94, -0.5, null),
      ('strength-density-6w', 2, 'Acumulacion', 'build', 1.00, 0.0, null),
      ('strength-density-6w', 3, 'Densidad alta', 'intensification', 1.04, 0.5, null),
      ('strength-density-6w', 4, 'Pico controlado', 'intensification', 1.08, 1.0, null),
      ('strength-density-6w', 5, 'Descarga', 'deload', 0.72, -1.5, 'Baja volumen y quita sets cercanos al fallo.'),
      ('strength-density-6w', 6, 'Reaceleracion', 'test', 1.02, 0.5, null)
  ) as seed(protocol_code, week_number, label, week_type, load_factor, rpe_offset, notes)
)
insert into public.training_protocol_weeks (protocol_id, week_number, label, week_type, load_factor, rpe_offset, notes)
select
  protocols.id,
  protocol_week_seed.week_number,
  protocol_week_seed.label,
  protocol_week_seed.week_type::public.training_protocol_week_type,
  protocol_week_seed.load_factor,
  protocol_week_seed.rpe_offset,
  protocol_week_seed.notes
from protocol_week_seed
join public.training_protocols protocols
  on protocols.code = protocol_week_seed.protocol_code
on conflict (protocol_id, week_number) do update
set
  label = excluded.label,
  week_type = excluded.week_type,
  load_factor = excluded.load_factor,
  rpe_offset = excluded.rpe_offset,
  notes = excluded.notes;

with protocol_week_template_seed as (
  select *
  from (
    values
      ('strength-density-6w', 1, 'pull-density', 0, 0, 0.0, -0.5, null),
      ('strength-density-6w', 1, 'push-hypertrophy', 2, 0, 0.0, -0.5, null),
      ('strength-density-6w', 1, 'boxing-cardio', 4, 0, 0.0, 0.0, null),
      ('strength-density-6w', 1, 'legs-strength', 5, 0, 0.0, -0.5, null),
      ('strength-density-6w', 2, 'pull-density', 0, 0, 2.5, 0.0, null),
      ('strength-density-6w', 2, 'push-hypertrophy', 2, 0, 2.5, 0.0, null),
      ('strength-density-6w', 2, 'boxing-cardio', 4, 0, 0.0, 0.2, null),
      ('strength-density-6w', 2, 'legs-strength', 5, 0, 2.5, 0.0, null),
      ('strength-density-6w', 3, 'pull-density', 0, 0, 5.0, 0.5, null),
      ('strength-density-6w', 3, 'push-hypertrophy', 2, 0, 5.0, 0.5, null),
      ('strength-density-6w', 3, 'boxing-cardio', 4, 0, 0.0, 0.5, null),
      ('strength-density-6w', 3, 'legs-strength', 5, 0, 5.0, 0.5, null),
      ('strength-density-6w', 4, 'pull-density', 0, 0, 7.5, 1.0, null),
      ('strength-density-6w', 4, 'push-hypertrophy', 2, 0, 7.5, 1.0, null),
      ('strength-density-6w', 4, 'boxing-cardio', 4, 0, 0.0, 0.5, null),
      ('strength-density-6w', 4, 'legs-strength', 5, 0, 7.5, 1.0, null),
      ('strength-density-6w', 5, 'pull-density', 0, 0, -10.0, -1.5, null),
      ('strength-density-6w', 5, 'push-hypertrophy', 2, 0, -10.0, -1.5, null),
      ('strength-density-6w', 5, 'boxing-cardio', 4, 0, -15.0, -1.0, null),
      ('strength-density-6w', 5, 'legs-strength', 5, 0, -10.0, -1.5, null),
      ('strength-density-6w', 6, 'pull-density', 0, 0, 4.0, 0.5, null),
      ('strength-density-6w', 6, 'push-hypertrophy', 2, 0, 4.0, 0.5, null),
      ('strength-density-6w', 6, 'boxing-cardio', 4, 0, 2.0, 0.2, null),
      ('strength-density-6w', 6, 'legs-strength', 5, 0, 4.0, 0.5, null)
  ) as seed(protocol_code, week_number, template_code, day_offset, order_index, progression_percent, target_rpe_delta, notes)
)
insert into public.training_protocol_week_templates (
  protocol_week_id,
  template_id,
  day_offset,
  order_index,
  progression_percent,
  target_rpe_delta,
  notes
)
select
  weeks.id,
  templates.id,
  protocol_week_template_seed.day_offset,
  protocol_week_template_seed.order_index,
  protocol_week_template_seed.progression_percent,
  protocol_week_template_seed.target_rpe_delta,
  protocol_week_template_seed.notes
from protocol_week_template_seed
join public.training_protocols protocols
  on protocols.code = protocol_week_template_seed.protocol_code
join public.training_protocol_weeks weeks
  on weeks.protocol_id = protocols.id
  and weeks.week_number = protocol_week_template_seed.week_number
join public.training_templates templates
  on templates.code = protocol_week_template_seed.template_code
where not exists (
  select 1
  from public.training_protocol_week_templates existing
  where existing.protocol_week_id = weeks.id
    and existing.day_offset = protocol_week_template_seed.day_offset
    and existing.order_index = protocol_week_template_seed.order_index
);

create or replace view public.v_exercise_catalog
with (security_invoker = true)
as
select
  exercises.id,
  exercises.slug,
  exercises.name,
  exercises.movement_pattern,
  exercises.stimulus_vector,
  exercises.resistance_profile,
  exercises.is_compound,
  exercises.equipment,
  exercises.cns_tax_multiplier,
  primary_muscle.slug as primary_muscle_slug,
  primary_muscle.name as primary_muscle_name,
  primary_muscle.category as primary_muscle_category,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'slug', secondary_muscle.slug,
        'name', secondary_muscle.name,
        'role', exercise_muscles.role
      )
      order by secondary_muscle.name
    ) filter (where secondary_muscle.id is not null),
    '[]'::jsonb
  ) as muscle_map
from public.exercises
left join public.muscle_groups as primary_muscle
  on primary_muscle.id = exercises.primary_muscle_id
left join public.exercise_muscles
  on exercise_muscles.exercise_id = exercises.id
left join public.muscle_groups as secondary_muscle
  on secondary_muscle.id = exercise_muscles.muscle_group_id
group by
  exercises.id,
  primary_muscle.slug,
  primary_muscle.name,
  primary_muscle.category;

create or replace view public.v_workout_session_summary
with (security_invoker = true)
as
select
  workout_sessions.id as session_id,
  workout_sessions.user_id,
  workout_sessions.source,
  workout_sessions.started_at,
  workout_sessions.ended_at,
  workout_sessions.notes,
  count(distinct workout_entries.id) as entry_count,
  count(workout_sets.id) as total_sets,
  coalesce(sum(workout_sets.reps), 0) as total_reps,
  coalesce(sum(coalesce(workout_sets.reps, 0) * coalesce(workout_sets.weight_kg, 0)), 0)::numeric(12,2) as total_load_kg,
  coalesce(sum(workout_sets.duration_seconds), 0) as total_duration_seconds,
  coalesce(max(workout_sets.rpe), 0) as peak_rpe,
  round(coalesce(avg(workout_sets.rpe), 0)::numeric, 1) as average_rpe,
  workout_sessions.title
from public.workout_sessions
left join public.workout_entries
  on workout_entries.session_id = workout_sessions.id
left join public.workout_sets
  on workout_sets.entry_id = workout_entries.id
group by workout_sessions.id;

create or replace view public.v_workout_muscle_load
with (security_invoker = true)
as
select
  workout_sessions.id as session_id,
  workout_sessions.user_id,
  muscle_groups.slug as muscle_slug,
  muscle_groups.name as muscle_name,
  muscle_groups.category,
  muscle_groups.recovery_time_hours,
  count(workout_sets.id) as total_sets,
  coalesce(sum(workout_sets.reps), 0) as total_reps,
  coalesce(sum(coalesce(workout_sets.reps, 0) * coalesce(workout_sets.weight_kg, 0)), 0)::numeric(12,2) as total_load_kg,
  round(coalesce(avg(workout_sets.rpe), 0)::numeric, 1) as average_rpe
from public.workout_sessions
join public.workout_entries
  on workout_entries.session_id = workout_sessions.id
join public.exercises
  on exercises.id = workout_entries.exercise_id
join public.exercise_muscles
  on exercise_muscles.exercise_id = exercises.id
  and exercise_muscles.role in ('primary', 'secondary', 'stabilizer')
join public.muscle_groups
  on muscle_groups.id = exercise_muscles.muscle_group_id
join public.workout_sets
  on workout_sets.entry_id = workout_entries.id
group by
  workout_sessions.id,
  workout_sessions.user_id,
  muscle_groups.slug,
  muscle_groups.name,
  muscle_groups.category,
  muscle_groups.recovery_time_hours;

grant select on public.v_exercise_catalog to anon, authenticated;
grant select on public.v_workout_session_summary to authenticated;
grant select on public.v_workout_muscle_load to authenticated;