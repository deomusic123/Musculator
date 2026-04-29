insert into public.muscle_groups (slug, name, category, recovery_time_hours)
values
  ('dorsal', 'Dorsal', 'Espalda', 72),
  ('trapecio', 'Trapecio', 'Espalda', 48),
  ('deltoides-lateral', 'Deltoides lateral', 'Hombro', 48),
  ('pectoral', 'Pectoral', 'Pecho', 72),
  ('cuadriceps', 'Cuadriceps', 'Pierna', 72),
  ('femoral', 'Femoral', 'Pierna', 72),
  ('gluteo', 'Gluteo', 'Pierna', 72),
  ('core', 'Core', 'Core', 36)
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  recovery_time_hours = excluded.recovery_time_hours;

insert into public.exercises (slug, name, primary_muscle_id, stimulus_vector, is_compound, equipment)
select 'barbell-row', 'Remo con barra', id, 'densidad', true, 'Barra'
from public.muscle_groups
where slug = 'dorsal'
on conflict (slug) do update
set
  name = excluded.name,
  primary_muscle_id = excluded.primary_muscle_id,
  stimulus_vector = excluded.stimulus_vector,
  is_compound = excluded.is_compound,
  equipment = excluded.equipment;

insert into public.exercises (slug, name, primary_muscle_id, stimulus_vector, is_compound, equipment)
select 'lat-pulldown', 'Jalon al pecho', id, 'amplitud', false, 'Polea'
from public.muscle_groups
where slug = 'dorsal'
on conflict (slug) do update
set
  name = excluded.name,
  primary_muscle_id = excluded.primary_muscle_id,
  stimulus_vector = excluded.stimulus_vector,
  is_compound = excluded.is_compound,
  equipment = excluded.equipment;

insert into public.exercises (slug, name, primary_muscle_id, stimulus_vector, is_compound, equipment)
select 'heavy-bag-round', 'Saco pesado', id, 'cardio_metabolico', true, 'Saco pesado'
from public.muscle_groups
where slug = 'core'
on conflict (slug) do update
set
  name = excluded.name,
  primary_muscle_id = excluded.primary_muscle_id,
  stimulus_vector = excluded.stimulus_vector,
  is_compound = excluded.is_compound,
  equipment = excluded.equipment;

insert into public.exercises (slug, name, primary_muscle_id, stimulus_vector, is_compound, equipment)
select 'back-squat', 'Sentadilla trasera', id, 'fuerza_base', true, 'Barra'
from public.muscle_groups
where slug = 'cuadriceps'
on conflict (slug) do update
set
  name = excluded.name,
  primary_muscle_id = excluded.primary_muscle_id,
  stimulus_vector = excluded.stimulus_vector,
  is_compound = excluded.is_compound,
  equipment = excluded.equipment;
