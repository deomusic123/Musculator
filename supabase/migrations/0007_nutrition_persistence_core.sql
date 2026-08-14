-- Etapa DB 0007
-- Persistencia de nutricion diaria conectada al flujo por cliente.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'meal_log_status'
  ) then
    create type public.meal_log_status as enum (
      'draft',
      'confirmed'
    );
  end if;
end
$$;

alter type public.meal_log_status add value if not exists 'draft';
alter type public.meal_log_status add value if not exists 'confirmed';

create table if not exists public.nutrition_day_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  day_date date not null,
  kcal_target integer not null default 0 check (kcal_target >= 0),
  protein_target integer not null default 0 check (protein_target >= 0),
  carbs_target integer not null default 0 check (carbs_target >= 0),
  fats_target integer not null default 0 check (fats_target >= 0),
  water_target_ml integer not null default 0 check (water_target_ml >= 0),
  extra_water_ml integer not null default 0 check (extra_water_ml >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id, day_date)
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
  client_id uuid references public.clients (id) on delete cascade,
  source public.ingestion_source not null default 'manual',
  meal_slot text,
  meal_name text,
  notes text,
  image_path text,
  eaten_at timestamptz not null default timezone('utc', now()),
  status public.meal_log_status not null default 'draft',
  kcal integer check (kcal >= 0),
  protein_g numeric(8,2) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8,2) check (carbs_g is null or carbs_g >= 0),
  fats_g numeric(8,2) check (fats_g is null or fats_g >= 0),
  hydration_ml integer not null default 0 check (hydration_ml >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.meal_logs
  add column if not exists client_id uuid references public.clients (id) on delete cascade;

alter table if exists public.meal_logs
  add column if not exists meal_slot text;

alter table if exists public.meal_logs
  add column if not exists meal_name text;

alter table if exists public.meal_logs
  add column if not exists notes text;

alter table if exists public.meal_logs
  add column if not exists kcal integer check (kcal >= 0);

alter table if exists public.meal_logs
  add column if not exists protein_g numeric(8,2) check (protein_g is null or protein_g >= 0);

alter table if exists public.meal_logs
  add column if not exists carbs_g numeric(8,2) check (carbs_g is null or carbs_g >= 0);

alter table if exists public.meal_logs
  add column if not exists fats_g numeric(8,2) check (fats_g is null or fats_g >= 0);

alter table if exists public.meal_logs
  add column if not exists hydration_ml integer not null default 0 check (hydration_ml >= 0);

create table if not exists public.meal_detections (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  label text not null,
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  grams_estimate numeric(8,2),
  bounding_box jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.meal_detections
  add column if not exists grams_estimate numeric(8,2);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  food_id uuid references public.foods (id),
  label text not null,
  grams numeric(8,2) check (grams is null or grams > 0),
  confidence numeric(4,3) check (confidence >= 0 and confidence <= 1),
  kcal integer check (kcal is null or kcal >= 0),
  protein_g numeric(8,2) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8,2) check (carbs_g is null or carbs_g >= 0),
  fats_g numeric(8,2) check (fats_g is null or fats_g >= 0),
  hydration_ml integer check (hydration_ml is null or hydration_ml >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.meal_items
  add column if not exists kcal integer check (kcal is null or kcal >= 0);

alter table if exists public.meal_items
  add column if not exists protein_g numeric(8,2) check (protein_g is null or protein_g >= 0);

alter table if exists public.meal_items
  add column if not exists carbs_g numeric(8,2) check (carbs_g is null or carbs_g >= 0);

alter table if exists public.meal_items
  add column if not exists fats_g numeric(8,2) check (fats_g is null or fats_g >= 0);

alter table if exists public.meal_items
  add column if not exists hydration_ml integer check (hydration_ml is null or hydration_ml >= 0);

alter table if exists public.meal_items
  add column if not exists notes text;

create index if not exists nutrition_day_targets_client_day_idx
  on public.nutrition_day_targets (client_id, day_date desc);

create index if not exists nutrition_day_targets_user_day_idx
  on public.nutrition_day_targets (user_id, day_date desc);

create index if not exists meal_logs_client_eaten_idx
  on public.meal_logs (client_id, eaten_at desc);

create index if not exists meal_logs_user_eaten_idx
  on public.meal_logs (user_id, eaten_at desc);

create index if not exists meal_logs_slot_idx
  on public.meal_logs (meal_slot);

create index if not exists meal_items_meal_log_idx
  on public.meal_items (meal_log_id);

create index if not exists meal_detections_meal_log_idx
  on public.meal_detections (meal_log_id);

drop trigger if exists nutrition_day_targets_set_updated_at on public.nutrition_day_targets;
create trigger nutrition_day_targets_set_updated_at
before update on public.nutrition_day_targets
for each row
execute function public.touch_updated_at();

drop trigger if exists meal_logs_set_updated_at on public.meal_logs;
create trigger meal_logs_set_updated_at
before update on public.meal_logs
for each row
execute function public.touch_updated_at();

alter table public.nutrition_day_targets enable row level security;
alter table public.foods enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_detections enable row level security;
alter table public.meal_items enable row level security;

drop policy if exists nutrition_day_targets_manage_own on public.nutrition_day_targets;
create policy nutrition_day_targets_manage_own
on public.nutrition_day_targets
for all
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.clients clients
    where clients.id = nutrition_day_targets.client_id
      and clients.owner_user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.clients clients
    where clients.id = nutrition_day_targets.client_id
      and clients.owner_user_id = auth.uid()
  )
);

drop policy if exists catalog_read_foods on public.foods;
create policy catalog_read_foods
on public.foods
for select
to authenticated
using (true);

drop policy if exists meal_logs_manage_own on public.meal_logs;
create policy meal_logs_manage_own
on public.meal_logs
for all
to authenticated
using (
  auth.uid() = user_id
  and (
    client_id is null
    or exists (
      select 1
      from public.clients clients
      where clients.id = meal_logs.client_id
        and clients.owner_user_id = auth.uid()
    )
  )
)
with check (
  auth.uid() = user_id
  and (
    client_id is null
    or exists (
      select 1
      from public.clients clients
      where clients.id = meal_logs.client_id
        and clients.owner_user_id = auth.uid()
    )
  )
);

drop policy if exists meal_detections_manage_own on public.meal_detections;
create policy meal_detections_manage_own
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

drop policy if exists meal_items_manage_own on public.meal_items;
create policy meal_items_manage_own
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

create or replace view public.v_nutrition_daily_summary
with (security_invoker = true)
as
with meal_rollup as (
  select
    logs.user_id,
    logs.client_id,
    date(timezone('utc', logs.eaten_at)) as day_date,
    count(*) as meals_count,
    coalesce(sum(logs.kcal), 0) as total_kcal,
    coalesce(sum(logs.protein_g), 0)::numeric(10,2) as total_protein_g,
    coalesce(sum(logs.carbs_g), 0)::numeric(10,2) as total_carbs_g,
    coalesce(sum(logs.fats_g), 0)::numeric(10,2) as total_fats_g,
    coalesce(sum(logs.hydration_ml), 0) as total_hydration_ml
  from public.meal_logs logs
  group by
    logs.user_id,
    logs.client_id,
    date(timezone('utc', logs.eaten_at))
)
select
  targets.user_id,
  targets.client_id,
  targets.day_date,
  coalesce(meal_rollup.meals_count, 0) as meals_count,
  coalesce(meal_rollup.total_kcal, 0) as total_kcal,
  coalesce(meal_rollup.total_protein_g, 0)::numeric(10,2) as total_protein_g,
  coalesce(meal_rollup.total_carbs_g, 0)::numeric(10,2) as total_carbs_g,
  coalesce(meal_rollup.total_fats_g, 0)::numeric(10,2) as total_fats_g,
  (coalesce(meal_rollup.total_hydration_ml, 0) + targets.extra_water_ml) as total_hydration_ml,
  targets.kcal_target,
  targets.protein_target,
  targets.carbs_target,
  targets.fats_target,
  targets.water_target_ml,
  targets.extra_water_ml
from public.nutrition_day_targets targets
left join meal_rollup
  on meal_rollup.user_id = targets.user_id
 and meal_rollup.client_id = targets.client_id
 and meal_rollup.day_date = targets.day_date;

grant select on public.v_nutrition_daily_summary to authenticated;
