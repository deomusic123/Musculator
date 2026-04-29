-- Etapa 1 hotfix: normaliza contrato de v_exercise_catalog.
-- En entornos legacy, CREATE OR REPLACE puede fallar con 42P16 por orden/nombres
-- de columnas distinto; forzamos recreacion limpia.

drop view if exists public.v_exercise_catalog;

create view public.v_exercise_catalog
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

grant select on public.v_exercise_catalog to anon, authenticated;
