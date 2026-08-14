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
select 'heavy-bag-round', 'Saco pesado', id, 'acondicionamiento', true, 'Saco pesado'
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
select 'back-squat', 'Sentadilla trasera', id, 'fuerza', true, 'Barra'
from public.muscle_groups
where slug = 'cuadriceps'
on conflict (slug) do update
set
  name = excluded.name,
  primary_muscle_id = excluded.primary_muscle_id,
  stimulus_vector = excluded.stimulus_vector,
  is_compound = excluded.is_compound,
  equipment = excluded.equipment;

insert into public.foods (
  source_name,
  source_ref,
  canonical_name,
  serving_unit,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fats_per_100g,
  density_g_per_ml
)
values
  ('musculator-core', 'chicken-breast', 'Pechuga de pollo cocida', 'g', 165, 31, 0, 3.6, null),
  ('musculator-core', 'white-rice', 'Arroz blanco cocido', 'g', 130, 2.4, 28.2, 0.3, null),
  ('musculator-core', 'oats', 'Avena tradicional', 'g', 389, 16.9, 66.3, 6.9, null),
  ('musculator-core', 'banana', 'Banana', 'g', 89, 1.1, 22.8, 0.3, null),
  ('musculator-core', 'olive-oil', 'Aceite de oliva extra virgen', 'ml', 884, 0, 0, 100, 0.91)
on conflict (source_name, source_ref) do update
set
  canonical_name = excluded.canonical_name,
  serving_unit = excluded.serving_unit,
  calories_per_100g = excluded.calories_per_100g,
  protein_per_100g = excluded.protein_per_100g,
  carbs_per_100g = excluded.carbs_per_100g,
  fats_per_100g = excluded.fats_per_100g,
  density_g_per_ml = excluded.density_g_per_ml;
