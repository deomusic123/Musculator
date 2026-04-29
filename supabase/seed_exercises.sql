-- Seed de ejercicios para Etapa 0.5 (80-100 ejercicios)
-- Nota: recovery_time_hours sigue normalizado por muscle_groups.

with exercise_seed as (
  select *
  from (
    values
      -- Pectoral / empuje horizontal
      ('barbell-bench-press', 'Press banca con barra', 'pectoral', 'horizontal_push', 'fuerza', 'free_weight', true, 'Barra', 8.5),
      ('incline-bench-press', 'Press inclinado', 'pectoral', 'horizontal_push', 'fuerza', 'free_weight', true, 'Barra', 8.8),
      ('decline-bench-press', 'Press declinado', 'pectoral', 'horizontal_push', 'densidad', 'free_weight', true, 'Barra', 8.3),
      ('flat-dumbbell-press', 'Press plano con mancuernas', 'pectoral', 'horizontal_push', 'fuerza', 'free_weight', true, 'Mancuernas', 8.2),
      ('weighted-dip', 'Fondo lastrado', 'pectoral', 'horizontal_push', 'fuerza', 'bodyweight', true, 'Cinturon de lastre', 8.7),
      ('push-up', 'Flexiones', 'pectoral', 'horizontal_push', 'densidad', 'bodyweight', true, 'Peso corporal', 5.2),
      ('cable-chest-fly', 'Aperturas en polea', 'pectoral', 'isolation', 'amplitud', 'cable', false, 'Polea', 3.5),
      ('machine-chest-press', 'Press de pecho en maquina', 'pectoral', 'horizontal_push', 'densidad', 'machine_constant', true, 'Maquina', 6.4),
      ('pec-deck-fly', 'Pec deck', 'pectoral', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 3.2),

      -- Dorsal / traccion
      ('barbell-row', 'Remo con barra', 'dorsal', 'horizontal_pull', 'densidad', 'free_weight', true, 'Barra', 8.4),
      ('pendlay-row', 'Remo pendlay', 'dorsal', 'horizontal_pull', 'fuerza', 'free_weight', true, 'Barra', 8.8),
      ('chest-supported-row', 'Remo con apoyo de pecho', 'dorsal', 'horizontal_pull', 'densidad', 'machine_constant', true, 'Maquina', 6.6),
      ('seated-cable-row', 'Remo sentado en polea', 'dorsal', 'horizontal_pull', 'densidad', 'cable', true, 'Polea', 6.2),
      ('single-arm-dumbbell-row', 'Remo unilateral con mancuerna', 'dorsal', 'horizontal_pull', 'amplitud', 'free_weight', true, 'Mancuerna', 7.1),
      ('lat-pulldown', 'Jalon al pecho', 'dorsal', 'vertical_pull', 'amplitud', 'cable', false, 'Polea', 5.7),
      ('wide-grip-pulldown', 'Jalon agarre amplio', 'dorsal', 'vertical_pull', 'amplitud', 'cable', false, 'Polea', 5.5),
      ('pull-up', 'Dominadas', 'dorsal', 'vertical_pull', 'fuerza', 'bodyweight', true, 'Barra de dominadas', 8.3),
      ('weighted-pull-up', 'Dominadas lastradas', 'dorsal', 'vertical_pull', 'fuerza', 'bodyweight', true, 'Barra de dominadas', 9.0),
      ('chin-up', 'Chin up', 'dorsal', 'vertical_pull', 'densidad', 'bodyweight', true, 'Barra de dominadas', 7.8),
      ('straight-arm-pulldown', 'Pullover en polea', 'dorsal', 'isolation', 'amplitud', 'cable', false, 'Polea', 3.3),

      -- Trapecio / espalda alta
      ('barbell-shrug', 'Encogimientos con barra', 'trapecio', 'isolation', 'densidad', 'free_weight', false, 'Barra', 3.4),
      ('dumbbell-shrug', 'Encogimientos con mancuerna', 'trapecio', 'isolation', 'densidad', 'free_weight', false, 'Mancuernas', 3.1),
      ('face-pull', 'Face pull', 'trapecio', 'horizontal_pull', 'amplitud', 'cable', false, 'Polea', 3.8),
      ('rear-delt-row', 'Remo alto para deltoides posterior', 'trapecio', 'horizontal_pull', 'amplitud', 'cable', false, 'Polea', 4.2),

      -- Deltoides
      ('overhead-press', 'Press militar', 'deltoides-anterior', 'vertical_push', 'fuerza', 'free_weight', true, 'Barra', 8.4),
      ('push-press', 'Push press', 'deltoides-anterior', 'vertical_push', 'potencia', 'free_weight', true, 'Barra', 9.5),
      ('arnold-press', 'Press arnold', 'deltoides-anterior', 'vertical_push', 'amplitud', 'free_weight', true, 'Mancuernas', 7.1),
      ('landmine-press', 'Press landmine', 'deltoides-anterior', 'vertical_push', 'densidad', 'free_weight', true, 'Landmine', 7.3),
      ('lateral-raise', 'Elevacion lateral', 'deltoides-lateral', 'isolation', 'amplitud', 'free_weight', false, 'Mancuernas', 2.8),
      ('machine-lateral-raise', 'Elevacion lateral en maquina', 'deltoides-lateral', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 2.6),
      ('cable-lateral-raise', 'Elevacion lateral en polea', 'deltoides-lateral', 'isolation', 'amplitud', 'cable', false, 'Polea', 2.9),
      ('upright-row', 'Remo al menton', 'deltoides-lateral', 'vertical_pull', 'densidad', 'free_weight', true, 'Barra', 5.7),

      -- Biceps
      ('barbell-curl', 'Curl con barra', 'biceps', 'isolation', 'amplitud', 'free_weight', false, 'Barra', 2.7),
      ('incline-dumbbell-curl', 'Curl inclinado con mancuerna', 'biceps', 'isolation', 'amplitud', 'free_weight', false, 'Mancuernas', 2.6),
      ('hammer-curl', 'Curl martillo', 'biceps', 'isolation', 'densidad', 'free_weight', false, 'Mancuernas', 2.9),
      ('preacher-curl', 'Curl predicador', 'biceps', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 2.5),
      ('cable-curl', 'Curl en polea', 'biceps', 'isolation', 'densidad', 'cable', false, 'Polea', 2.6),
      ('bayesian-curl', 'Curl bayesian', 'biceps', 'isolation', 'amplitud', 'cable', false, 'Polea', 2.4),
      ('chin-curl-machine', 'Curl en maquina convergente', 'biceps', 'isolation', 'densidad', 'machine_variable', false, 'Maquina', 2.7),

      -- Triceps
      ('rope-pushdown', 'Pushdown en cuerda', 'triceps', 'isolation', 'densidad', 'cable', false, 'Polea', 2.5),
      ('straight-bar-pushdown', 'Pushdown con barra recta', 'triceps', 'isolation', 'densidad', 'cable', false, 'Polea', 2.6),
      ('overhead-triceps-extension', 'Extension de triceps sobre cabeza', 'triceps', 'isolation', 'amplitud', 'cable', false, 'Polea', 2.7),
      ('skull-crusher', 'Rompecraneos', 'triceps', 'isolation', 'amplitud', 'free_weight', false, 'Barra EZ', 3.0),
      ('single-arm-kickback', 'Patada de triceps', 'triceps', 'isolation', 'amplitud', 'free_weight', false, 'Mancuerna', 2.2),
      ('machine-dip', 'Fondo asistido en maquina', 'triceps', 'vertical_push', 'densidad', 'machine_constant', true, 'Maquina', 5.4),
      ('close-grip-bench', 'Press cerrado', 'triceps', 'horizontal_push', 'fuerza', 'free_weight', true, 'Barra', 8.0),

      -- Cuadriceps
      ('back-squat', 'Sentadilla trasera', 'cuadriceps', 'knee_dominant', 'fuerza', 'free_weight', true, 'Barra', 10.0),
      ('front-squat', 'Sentadilla frontal', 'cuadriceps', 'knee_dominant', 'fuerza', 'free_weight', true, 'Barra', 9.1),
      ('hack-squat', 'Hack squat', 'cuadriceps', 'knee_dominant', 'densidad', 'machine_constant', true, 'Maquina', 7.1),
      ('leg-press', 'Prensa inclinada', 'cuadriceps', 'knee_dominant', 'densidad', 'machine_constant', true, 'Maquina', 6.9),
      ('pendulum-squat', 'Pendulum squat', 'cuadriceps', 'knee_dominant', 'densidad', 'machine_variable', true, 'Maquina', 7.3),
      ('split-squat', 'Sentadilla dividida', 'cuadriceps', 'knee_dominant', 'amplitud', 'free_weight', true, 'Mancuernas', 6.6),
      ('bulgarian-split-squat', 'Bulgarian split squat', 'cuadriceps', 'knee_dominant', 'amplitud', 'free_weight', true, 'Mancuernas', 8.5),
      ('walking-lunge', 'Zancadas caminando', 'cuadriceps', 'knee_dominant', 'densidad', 'free_weight', true, 'Mancuernas', 6.3),
      ('step-up', 'Step up', 'cuadriceps', 'knee_dominant', 'densidad', 'bodyweight', true, 'Banco', 5.8),
      ('leg-extension', 'Extension de cuadriceps', 'cuadriceps', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 2.9),

      -- Femoral / bisagra
      ('romanian-deadlift', 'Peso muerto rumano', 'femoral', 'hip_hinge', 'amplitud', 'free_weight', true, 'Barra', 9.5),
      ('conventional-deadlift', 'Peso muerto convencional', 'femoral', 'hip_hinge', 'fuerza', 'free_weight', true, 'Barra', 10.0),
      ('sumo-deadlift', 'Peso muerto sumo', 'femoral', 'hip_hinge', 'fuerza', 'free_weight', true, 'Barra', 9.3),
      ('good-morning', 'Good morning', 'femoral', 'hip_hinge', 'amplitud', 'free_weight', true, 'Barra', 8.2),
      ('stiff-leg-deadlift', 'Peso muerto piernas rigidas', 'femoral', 'hip_hinge', 'amplitud', 'free_weight', true, 'Barra', 8.1),
      ('lying-leg-curl', 'Curl femoral acostado', 'femoral', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 3.0),
      ('seated-leg-curl', 'Curl femoral sentado', 'femoral', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 2.9),
      ('single-leg-curl', 'Curl femoral unilateral', 'femoral', 'isolation', 'amplitud', 'machine_variable', false, 'Maquina', 2.8),
      ('glute-ham-raise', 'Glute ham raise', 'femoral', 'hip_hinge', 'densidad', 'bodyweight', true, 'Banco GHR', 7.0),

      -- Gluteo
      ('hip-thrust', 'Hip thrust', 'gluteo', 'hip_hinge', 'densidad', 'free_weight', true, 'Barra', 7.4),
      ('barbell-glute-bridge', 'Puente de gluteo con barra', 'gluteo', 'hip_hinge', 'densidad', 'free_weight', true, 'Barra', 6.8),
      ('cable-pull-through', 'Pull through en polea', 'gluteo', 'hip_hinge', 'amplitud', 'cable', true, 'Polea', 5.7),
      ('reverse-hyperextension', 'Reverse hyperextension', 'gluteo', 'hip_hinge', 'amplitud', 'machine_variable', true, 'Maquina', 6.1),
      ('frog-pump', 'Frog pumps', 'gluteo', 'isolation', 'densidad', 'bodyweight', false, 'Peso corporal', 2.5),
      ('cable-glute-kickback', 'Patada de gluteo en polea', 'gluteo', 'isolation', 'amplitud', 'cable', false, 'Polea', 2.6),
      ('hip-abduction-machine', 'Abduccion en maquina', 'gluteo', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 2.4),

      -- Pantorrilla
      ('standing-calf-raise', 'Elevacion de talones de pie', 'pantorrilla', 'isolation', 'densidad', 'machine_constant', false, 'Maquina', 2.3),
      ('seated-calf-raise', 'Elevacion de talones sentado', 'pantorrilla', 'isolation', 'amplitud', 'machine_constant', false, 'Maquina', 2.1),
      ('donkey-calf-raise', 'Elevacion de talones donkey', 'pantorrilla', 'isolation', 'amplitud', 'bodyweight', false, 'Peso corporal', 2.2),
      ('single-leg-calf-raise', 'Elevacion de talon unilateral', 'pantorrilla', 'isolation', 'densidad', 'bodyweight', false, 'Escalon', 2.0),

      -- Core / anti movimiento / rotacion
      ('plank', 'Plancha frontal', 'core', 'core_anti_movement', 'acondicionamiento', 'bodyweight', false, 'Peso corporal', 3.5),
      ('side-plank', 'Plancha lateral', 'core', 'core_anti_movement', 'acondicionamiento', 'bodyweight', false, 'Peso corporal', 3.2),
      ('dead-bug', 'Dead bug', 'core', 'core_anti_movement', 'acondicionamiento', 'bodyweight', false, 'Peso corporal', 2.8),
      ('pallof-press', 'Pallof press', 'core', 'core_anti_movement', 'densidad', 'cable', false, 'Polea', 3.6),
      ('ab-wheel-rollout', 'Ab wheel rollout', 'core', 'core_anti_movement', 'amplitud', 'bodyweight', false, 'Rueda abdominal', 4.1),
      ('hanging-leg-raise', 'Elevaciones de piernas colgado', 'core', 'isolation', 'amplitud', 'bodyweight', false, 'Barra', 4.4),
      ('cable-woodchop', 'Woodchop en polea', 'core', 'rotation_ballistic', 'potencia', 'cable', false, 'Polea', 4.8),
      ('russian-twist', 'Russian twist', 'core', 'rotation_ballistic', 'acondicionamiento', 'bodyweight', false, 'Peso corporal', 3.7),
      ('medicine-ball-slam', 'Slam con balon medicinal', 'core', 'rotation_ballistic', 'potencia', 'bodyweight', true, 'Balon medicinal', 6.2),
      ('landmine-rotation', 'Rotacion con landmine', 'core', 'rotation_ballistic', 'potencia', 'free_weight', true, 'Landmine', 6.6),

      -- Locomocion / acondicionamiento
      ('jump-rope', 'Soga', 'pantorrilla', 'locomotion_metabolic', 'acondicionamiento', 'bodyweight', false, 'Soga', 4.5),
      ('farmer-carry', 'Farmer carry', 'trapecio', 'locomotion_metabolic', 'densidad', 'free_weight', true, 'Mancuernas', 7.2),
      ('sandbag-carry', 'Sandbag carry', 'core', 'locomotion_metabolic', 'densidad', 'free_weight', true, 'Sandbag', 7.1),
      ('sled-push', 'Empuje de trineo', 'cuadriceps', 'locomotion_metabolic', 'acondicionamiento', 'machine_variable', true, 'Trineo', 7.8),
      ('sled-sprint', 'Sprint con trineo', 'cuadriceps', 'locomotion_metabolic', 'potencia', 'machine_variable', true, 'Trineo', 8.3),
      ('battle-ropes', 'Battle ropes', 'deltoides-anterior', 'locomotion_metabolic', 'acondicionamiento', 'cable', false, 'Cuerda', 6.0),
      ('assault-bike-sprint', 'Sprint en assault bike', 'cuadriceps', 'locomotion_metabolic', 'acondicionamiento', 'machine_constant', true, 'Bicicleta', 7.0),
      ('rower-interval', 'Intervalos en remo', 'dorsal', 'locomotion_metabolic', 'acondicionamiento', 'machine_constant', true, 'Rower', 6.8),
      ('burpee', 'Burpees', 'core', 'locomotion_metabolic', 'acondicionamiento', 'bodyweight', true, 'Peso corporal', 6.1),
      ('burpee-pull-up', 'Burpee con dominada', 'dorsal', 'locomotion_metabolic', 'acondicionamiento', 'bodyweight', true, 'Barra de dominadas', 7.4),
      ('box-jump', 'Salto al cajon', 'cuadriceps', 'knee_dominant', 'potencia', 'bodyweight', true, 'Cajon', 6.5),
      ('kettlebell-swing', 'Kettlebell swing', 'gluteo', 'hip_hinge', 'potencia', 'free_weight', true, 'Kettlebell', 7.3),
      ('heavy-bag-rounds', 'Saco de boxeo', 'core', 'locomotion_metabolic', 'acondicionamiento', 'bodyweight', false, 'Saco', 6.1),
      ('mountain-climber', 'Mountain climber', 'core', 'locomotion_metabolic', 'acondicionamiento', 'bodyweight', false, 'Peso corporal', 4.6)
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
  muscle.id,
  exercise_seed.movement_pattern::public.movement_pattern,
  exercise_seed.stimulus_vector::public.stimulus_vector,
  exercise_seed.resistance_profile::public.resistance_profile,
  exercise_seed.is_compound,
  exercise_seed.equipment,
  exercise_seed.cns_tax_multiplier
from exercise_seed
join public.muscle_groups muscle
  on muscle.slug = exercise_seed.primary_muscle_slug
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
