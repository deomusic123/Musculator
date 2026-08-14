-- Etapa DB 0006
-- Consolida entidades de planning/training que existen en bootstrap pero no en la linea de migraciones.

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

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  goal text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.workout_sessions
  add column if not exists client_id uuid references public.clients (id) on delete set null;

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

create index if not exists clients_owner_created_idx
  on public.clients (owner_user_id, created_at desc);

create index if not exists workout_sessions_client_started_idx
  on public.workout_sessions (client_id, started_at desc);

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.clients enable row level security;
alter table public.training_templates enable row level security;
alter table public.training_template_entries enable row level security;
alter table public.training_template_sets enable row level security;
alter table public.training_protocols enable row level security;
alter table public.training_protocol_weeks enable row level security;
alter table public.training_protocol_week_templates enable row level security;
alter table public.client_protocol_assignments enable row level security;

drop policy if exists clients_manage_own on public.clients;
create policy clients_manage_own
on public.clients
for all
to authenticated
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

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

grant select on public.v_workout_session_summary to authenticated;
