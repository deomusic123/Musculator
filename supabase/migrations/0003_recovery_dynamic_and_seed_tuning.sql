-- Etapa 0.5/3 bridge
-- Ajusta tuning fisiologico clave y habilita recuperacion dinamica por sesion/musculo.

update public.exercises
set
  cns_tax_multiplier = 8.5
where slug = 'barbell-bench-press';

update public.exercises
set
  cns_tax_multiplier = 9.5
where slug = 'push-press';

update public.exercises
set
  cns_tax_multiplier = 10.0
where slug = 'back-squat';

update public.exercises
set
  cns_tax_multiplier = 8.5
where slug = 'bulgarian-split-squat';

update public.exercises
set
  stimulus_vector = 'amplitud'::public.stimulus_vector,
  cns_tax_multiplier = 9.5
where slug = 'romanian-deadlift';

update public.exercises
set
  cns_tax_multiplier = 10.0
where slug = 'conventional-deadlift';

create or replace view public.v_workout_muscle_load
with (security_invoker = true)
as
with role_enriched as (
  select
    workout_sessions.id as session_id,
    workout_sessions.user_id,
    muscle_groups.slug as muscle_slug,
    muscle_groups.name as muscle_name,
    muscle_groups.category,
    muscle_groups.recovery_time_hours,
    workout_sets.reps,
    workout_sets.weight_kg,
    workout_sets.rpe,
    exercises.cns_tax_multiplier,
    case exercise_muscles.role
      when 'primary' then 1.00
      when 'secondary' then 0.60
      when 'stabilizer' then 0.35
      else 0.50
    end::numeric as role_weight,
    case exercises.stimulus_vector
      when 'amplitud' then 1.18
      when 'fuerza' then 1.08
      when 'potencia' then 1.12
      when 'acondicionamiento' then 0.94
      when 'cardio_metabolico' then 0.92
      else 1.00
    end::numeric as stimulus_factor
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
),
aggregated as (
  select
    session_id,
    user_id,
    muscle_slug,
    muscle_name,
    category,
    recovery_time_hours,
    count(*) as total_sets,
    coalesce(sum(reps), 0) as total_reps,
    coalesce(sum(coalesce(reps, 0) * coalesce(weight_kg, 0)), 0)::numeric(12,2) as total_load_kg,
    round(coalesce(avg(rpe), 0)::numeric, 1) as average_rpe,
    coalesce(sum(role_weight), 0)::numeric as role_weighted_sets,
    coalesce(sum(cns_tax_multiplier * role_weight) / nullif(sum(role_weight), 0), 5.0)::numeric as average_cns_tax_multiplier,
    coalesce(sum(stimulus_factor * role_weight) / nullif(sum(role_weight), 0), 1.0)::numeric as average_stimulus_factor
  from role_enriched
  group by
    session_id,
    user_id,
    muscle_slug,
    muscle_name,
    category,
    recovery_time_hours
)
select
  session_id,
  user_id,
  muscle_slug,
  muscle_name,
  category,
  recovery_time_hours,
  total_sets,
  total_reps,
  total_load_kg,
  average_rpe,
  round(role_weighted_sets, 2) as role_weighted_sets,
  round(average_cns_tax_multiplier, 2) as average_cns_tax_multiplier,
  round(average_stimulus_factor, 2) as average_stimulus_factor,
  greatest(
    18,
    least(
      120,
      round(
        recovery_time_hours
        * greatest(
          0.85,
          least(1.30, 1 + ((average_cns_tax_multiplier - 5.0) / 5.0) * 0.30)
        )
        * average_stimulus_factor
      )
    )
  )::integer as recovery_time_dynamic_hours
from aggregated;
