-- Etapa 1 QA seed: relaciones sinergistas para probar Bottom Sheet.
-- Inserta sinergistas/stabilizers para 5 ejercicios de referencia.
-- Script idempotente: no duplica relaciones existentes.

with relation_seed as (
  select *
  from (
    values
      ('back-squat', 'gluteo', 'secondary'),
      ('back-squat', 'femoral', 'secondary'),
      ('back-squat', 'core', 'stabilizer'),

      ('barbell-bench-press', 'triceps', 'secondary'),
      ('barbell-bench-press', 'deltoides-anterior', 'secondary'),
      ('barbell-bench-press', 'core', 'stabilizer'),

      ('barbell-row', 'biceps', 'secondary'),
      ('barbell-row', 'trapecio', 'secondary'),
      ('barbell-row', 'core', 'stabilizer'),

      ('overhead-press', 'triceps', 'secondary'),
      ('overhead-press', 'deltoides-lateral', 'secondary'),
      ('overhead-press', 'core', 'stabilizer'),

      ('romanian-deadlift', 'gluteo', 'secondary'),
      ('romanian-deadlift', 'dorsal', 'stabilizer'),
      ('romanian-deadlift', 'core', 'stabilizer')
  ) as seed(exercise_slug, muscle_slug, role)
)
insert into public.exercise_muscles (
  exercise_id,
  muscle_group_id,
  role
)
select
  exercises.id,
  muscles.id,
  relation_seed.role::public.muscle_role
from relation_seed
join public.exercises as exercises
  on exercises.slug = relation_seed.exercise_slug
join public.muscle_groups as muscles
  on muscles.slug = relation_seed.muscle_slug
on conflict (exercise_id, muscle_group_id, role) do nothing;
