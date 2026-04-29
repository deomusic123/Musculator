-- Etapa 0.5 - Taxonomia biomecanica base para Lab
-- 1) movement_pattern: agrega isolation
-- 2) stimulus_vector: renombra fuerza_base -> fuerza
-- 3) resistance_profile: reemplaza machine/specific por machine_constant/machine_variable/bodyweight

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

alter type public.movement_pattern add value if not exists 'isolation';

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
      and typname = 'stimulus_vector'
  ) then
    create type public.stimulus_vector as enum (
      'amplitud',
      'densidad',
      'fuerza',
      'cardio_metabolico',
      'acondicionamiento',
      'potencia'
    );
  end if;
end
$$;

-- Renombra el valor legacy solo cuando aplica.
do $$
begin
  if exists (
    select 1
    from pg_enum enum
    join pg_type typ on typ.oid = enum.enumtypid
    where typ.typnamespace = 'public'::regnamespace
      and typ.typname = 'stimulus_vector'
      and enum.enumlabel = 'fuerza_base'
  ) and not exists (
    select 1
    from pg_enum enum
    join pg_type typ on typ.oid = enum.enumtypid
    where typ.typnamespace = 'public'::regnamespace
      and typ.typname = 'stimulus_vector'
      and enum.enumlabel = 'fuerza'
  ) then
    alter type public.stimulus_vector rename value 'fuerza_base' to 'fuerza';
  end if;
end
$$;

alter type public.stimulus_vector add value if not exists 'fuerza';
alter type public.stimulus_vector add value if not exists 'amplitud';
alter type public.stimulus_vector add value if not exists 'densidad';
alter type public.stimulus_vector add value if not exists 'potencia';
alter type public.stimulus_vector add value if not exists 'acondicionamiento';

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
      'machine_constant',
      'machine_variable'
    );
  end if;
end
$$;

alter table if exists public.exercises
  add column if not exists movement_pattern public.movement_pattern not null default 'horizontal_push';

alter table if exists public.exercises
  add column if not exists resistance_profile public.resistance_profile not null default 'free_weight';

alter table if exists public.exercises
  add column if not exists cns_tax_multiplier numeric(3,1) not null default 5.0;

-- Si la enum vieja aun tiene machine/specific, reconstruye el tipo y migra datos.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'resistance_profile'
  ) and exists (
    select 1
    from pg_enum enum
    join pg_type typ on typ.oid = enum.enumtypid
    where typ.typnamespace = 'public'::regnamespace
      and typ.typname = 'resistance_profile'
      and enum.enumlabel in ('machine', 'specific')
  ) then
    if exists (
      select 1
      from pg_type
      where typnamespace = 'public'::regnamespace
        and typname = 'resistance_profile_new'
    ) then
      drop type public.resistance_profile_new;
    end if;

    create type public.resistance_profile_new as enum (
      'bodyweight',
      'free_weight',
      'cable',
      'machine_constant',
      'machine_variable'
    );

    alter table public.exercises
      alter column resistance_profile drop default;

    alter table public.exercises
      alter column resistance_profile type public.resistance_profile_new
      using (
        case resistance_profile::text
          when 'machine' then 'machine_constant'
          when 'specific' then 'bodyweight'
          else resistance_profile::text
        end
      )::public.resistance_profile_new;

    drop type public.resistance_profile;
    alter type public.resistance_profile_new rename to resistance_profile;
  end if;
end
$$;

alter type public.resistance_profile add value if not exists 'bodyweight';
alter type public.resistance_profile add value if not exists 'free_weight';
alter type public.resistance_profile add value if not exists 'cable';
alter type public.resistance_profile add value if not exists 'machine_constant';
alter type public.resistance_profile add value if not exists 'machine_variable';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'exercises'
      and column_name = 'resistance_profile'
  ) then
    alter table public.exercises
      alter column resistance_profile set default 'free_weight'::public.resistance_profile;
  end if;
end
$$;
