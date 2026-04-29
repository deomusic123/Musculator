# Musculator Roadmap Vivo (Estado Real del Repositorio)

Documento de contexto operativo para continuar el proyecto en cualquier PC sin perder decisiones del chat.

## 1) Estado Actual

- Proyecto monorepo en npm workspaces con foco actual en musculacion (auth no bloqueante para el flujo principal).
- Frontend principal en Next.js App Router con TypeScript estricto y Tailwind CSS 4.
- Persistencia real en Supabase para clientes y sesiones de entrenamiento.
- Dashboard evolucionado a experiencia tipo app:
    - SPA por paneles internos (sin recarga para cambiar vista).
    - Navegacion tipo tabs (Perfil, Lab, Nutricion, Live).
    - Modo live inmersivo.
    - Base PWA configurada (manifest + service worker).
- Git configurado y sincronizado con:
    - origin: https://github.com/deomusic123/Musculator.git
    - rama principal: main

## 2) Arquitectura de Código

### Monorepo

- apps/web: aplicación Next.js.
- packages/contracts: esquemas y tipos compartidos (Zod + tipos runtime-safe).
- packages/domain: lógica de negocio de entrenamiento/readiness.
- supabase: SQL de bootstrap, migraciones y seed.
- n8n: prompts/base para orquestación NLP.

### Capas

- contracts: validación de payloads y contratos API.
- domain: cálculo de readiness, analítica de sesiones, catálogos.
- web/lib: adaptadores de entorno y persistencia.
- app/api: endpoints para clientes, sesiones e ingesta.

## 3) UX y Navegación (Implementado)

### Shell móvil estilo app

- Contenedor principal mobile-first con altura de viewport y scroll interno.
- Cambio de panel por estado local (SPA) en lugar de navegación de ruta para el flujo diario.
- Barra inferior móvil dedicada en:
    - Perfil
    - Lab
    - Nutricion
    - Boton Live

### Vistas

- Nivel 1 (tabs): Perfil, Lab, Nutricion.
- Clientes: vista dedicada de ABM, separada del perfil.
- Live: experiencia inmersiva de ejecución de sesión.

### Detalles en overlays

- Cards clave abren detalle en sheet/dialog, evitando cambios de página.
- Sheet adaptado para móvil como bottom sheet (hasta 90% alto).

### Transiciones

- AnimatePresence y motion para transición entre paneles internos.

## 4) PWA (Base lista)

### Manifest

- display: standalone
- orientation: portrait-primary
- theme_color: #0F172A
- background_color: #0F172A
- icono inicial SVG maskable.

### Service Worker

- Registro de SW en cliente.
- SW base placeholder (instalación/activación/listener de fetch).
- Pendiente hardening de estrategia de caché offline.

## 5) Supabase y Persistencia

### Variables de entorno clave (NO commitear secretos)

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_DEV_EMAIL
- SUPABASE_DEV_DISPLAY_NAME

Notas:

- Usar apps/web/.env.example como plantilla.
- .env.local debe permanecer local.

### Entidades principales

- clients: propietario lógico de historial y decisiones por persona.
- workout_sessions / workout_entries / workout_sets.
- estructuras extendidas de templates/protocolos/catalogo biomecánico.

### SQL relevante

- supabase/bootstrap_musculacion.sql
- supabase/migrations/0001_initial_schema.sql
- supabase/seed.sql

## 6) Rutas y Superficies

- /: dashboard principal (TrainingWorkspace).
- /dashboard: alias a /.
- /lab/*: superficie administrativa de lab.
- /session/[id]: ruta de sesión aislada.

## 7) Archivos Clave

### App y shell

- apps/web/src/app/layout.tsx
- apps/web/src/app/(shell)/page.tsx
- apps/web/src/components/navigation/app-nav.tsx

### Workspace y navegación interna

- apps/web/src/components/training/workspace.tsx
- apps/web/src/components/training/mobile-tab-bar.tsx
- apps/web/src/components/overlays/global-overlay-provider.tsx

### PWA

- apps/web/src/app/manifest.ts
- apps/web/src/components/pwa/register-sw.tsx
- apps/web/public/sw.js
- apps/web/public/icons/icon.svg

### Dominio/contratos

- packages/contracts/src/training.ts
- packages/domain/src/training.ts
- packages/domain/src/readiness.ts

### Persistencia/API

- apps/web/src/lib/training/persistence.ts
- apps/web/src/lib/client/persistence.ts
- apps/web/src/app/api/training/sessions/route.ts
- apps/web/src/app/api/clients/route.ts

## 8) Flujo de Trabajo Git (Estable para rollback)

### Convención usada

- Commits por etapa funcional para rollback quirúrgico.
- Push frecuente a main para backup remoto continuo.

### Commits de referencia recientes

- 7611ad5 feat: bootstrap musculator training workspace
- 8acd5ef feat(web): add mobile spa training shell
- 98ec71d feat(web): add animated panel transitions and mobile sheets
- 1d51621 feat(web): configure pwa manifest and service worker

## 9) Setup en Nueva PC

1. Clonar el repo.
2. Instalar Node >= 22.
3. Ejecutar npm install en la raíz.
4. Copiar apps/web/.env.example a apps/web/.env.local y completar variables.
5. Ejecutar:
     - npm run typecheck
     - npm run dev --workspace @musculator/web
6. Abrir http://localhost:3000 o puerto disponible.

## 10) Comandos Útiles

- npm run dev
- npm run build
- npm run lint
- npm run typecheck

Solo web:

- npm run dev --workspace @musculator/web
- npm run typecheck --workspace @musculator/web

## 11) Riesgos Conocidos y Decisiones

- El modo live intenta fullscreen, pero depende de soporte/permisos del navegador.
- El SW actual es base: sirve para instalación, no para offline robusto.
- El estado del workspace sigue grande en un solo componente; conviene modularizar por feature slice.

## 12) Próximas Etapas Prioritarias

### Etapa A: PWA hardening

- Estrategia de caché (app shell + assets + fallback offline).
- Íconos PNG 192/512.
- Prompt de instalación y control de updates.

### Etapa B: Modularización workspace

- Extraer perfil/lab/nutricion/live a componentes por dominio.
- Reducir tamaño de workspace.tsx y mejorar testabilidad.

### Etapa C: Lab real

- Reemplazar skeletons de /lab por ABM real de templates/protocolos/catálogo.

### Etapa D: Live conectado extremo a extremo

- Unificar ruta /session/[id] con estado persistido y acciones de guardado/recuperación en caliente.

## 13) Principios de Producto Vigentes

- Mobile-first real, sensación de app instalada.
- Cero recarga en navegación diaria.
- Datos primero (persistencia + contratos), visual después.
- Cambios por etapas y commits pequeños para estabilidad.

## 14) Plan Tactico Analitica Pro Desde Lab (2026-04-29)

- Objetivo: ejecutar la opcion Analitica Pro con orden estricto, arrancando por infraestructura de Ejercicios y Rutinas antes de conectar Perfil Pro.
- Regla de secuencia: no se avanza de etapa sin gate de salida aprobado y evidencia registrada.

### Etapa 0 (Deuda Tecnica Bloqueante)

- Meta: sincronizar supabase-types.ts con el esquema SQL real (tablas, vistas, enums y relaciones usadas por Lab y workspace).
- Archivos y rutas a tocar primero:
    - apps/web/src/lib/platform/supabase-types.ts
    - supabase/bootstrap_musculacion.sql (fuente de verdad para el tipado)
    - supabase/migrations/0001_initial_schema.sql (compatibilidad historica)
- Alcance minimo obligatorio:
    - Tables: clients, muscle_groups, exercises, exercise_muscles, training_templates, training_template_entries, training_template_sets, training_protocols, training_protocol_weeks, training_protocol_week_templates, client_protocol_assignments, workout_sessions, workout_entries, workout_sets, training_ingestions.
    - Views: v_exercise_catalog, v_workout_session_summary, v_workout_muscle_load.
    - Enums: stimulus_vector, movement_pattern, resistance_profile, training_session_kind, training_protocol_week_type, training_protocol_assignment_status, ingestion_source, ingestion_status, muscle_role.
- Gate de salida:
    - Typecheck completo en verde.
    - Sin casts ad hoc para tablas/vistas del Lab.
    - Queries del Lab compilando con tipos concretos.
- Evidencia:
    - Resultado de npm run typecheck.
    - Lista de entidades tipadas actualizada en este roadmap.

### Etapa 1 (Catalogo Lab UI/UX)

- Meta: convertir /lab/exercises en catalogo real, navegable y filtrable por ejes biomecanicos y carga neural.
- Rutas/componentes a tocar primero:
    - apps/web/src/app/(shell)/lab/exercises/page.tsx
    - apps/web/src/components/lab/lab-tabs.tsx
    - apps/web/src/app/(shell)/lab/layout.tsx
- Backend/BFF a crear o ajustar:
    - app/api/lab/exercises/route.ts (lectura paginada y filtros server-side desde v_exercise_catalog)
    - lib/training o lib/lab/persistence.ts para consulta tipada del catalogo.
- Filtros obligatorios:
    - Patrones: movement_pattern.
    - Vector: stimulus_vector.
    - Equipamiento/perfil: equipment y resistance_profile.
    - CNS Tax: cns_tax_multiplier en rangos (ej: 1-3, 4-6, 7-10).
    - Busqueda por slug/nombre/musculo.
- Gate de salida:
    - /lab/exercises renderiza datos reales.
    - Filtros combinables funcionando sin recarga total.
    - Estado vacio y estado error resueltos.
- Evidencia:
    - Capturas o checklist funcional de filtros.
    - Conteo real de ejercicios retornados por API.

### Etapa 2 (Constructor de Templates)

- Meta: crear constructor en /lab/templates para armar rutinas desde catalogo real y calcular costo neural estimado en tiempo real.
- Rutas/componentes a tocar primero:
    - apps/web/src/app/(shell)/lab/templates/page.tsx
    - apps/web/src/app/(shell)/lab/exercises/page.tsx (selector reutilizable o panel lateral)
    - components/lab/* nuevos: builder de plantilla, lista de entradas, editor de sets.
- Backend/BFF a crear o ajustar:
    - app/api/lab/templates/route.ts (GET/POST)
    - app/api/lab/templates/[id]/route.ts (GET/PATCH)
    - Persistencia para training_templates, training_template_entries, training_template_sets.
- Regla de calculo inicial (v1):
    - Costo neural estimado por template = suma de (sets objetivo por ejercicio x cns_tax_multiplier del ejercicio).
    - Mostrar semaforo operativo (bajo/medio/alto) y desglose por ejercicio.
- Gate de salida:
    - Crear/editar template persistido en SQL.
    - Costo neural actualizado en vivo al agregar/quitar/editar ejercicios.
    - Recuperacion del template consistente al recargar.
- Evidencia:
    - Template guardado con entries y sets.
    - Valor de costo neural visible y trazable por ejercicio.

### Etapa 3 (Perfil Pro)

- Precondicion estricta: Etapas 0, 1 y 2 cerradas con gates aprobados.
- Meta: conectar analitica pro en perfil usando datos estructurados reales de Lab + historial por cliente.
- Archivos/rutas a tocar primero:
    - apps/web/src/components/training/workspace.tsx
    - apps/web/src/lib/training/persistence.ts
    - app/api/training/sessions/route.ts
    - app/api/clients/route.ts
- Integraciones de visualizacion:
    - Radar: balance por patrones/vectores comparando carga real vs objetivo de bloque/template.
    - Heatmap: consistencia + intensidad + soporte metabolico.
    - Cards: readiness, costo neural semanal, gap de recuperacion nutricional.
- Gate de salida:
    - Perfil muestra relaciones conectadas entre CNS Tax, Patrones, Recuperacion y Macros.
    - Analitica derivada de datos persistidos por cliente, no placeholders.
    - Smoke funcional completo en Perfil, Lab y Live.
- Evidencia:
    - Demo con cliente real y sesiones guardadas.
    - Validacion de coherencia entre SQL, API y UI.

### Orden operativo recomendado (primeras intervenciones)

1. Tipado Supabase (Etapa 0).
2. Endpoint y persistencia de catalogo (inicio Etapa 1).
3. UI filtros de /lab/exercises (cierre Etapa 1).
4. Endpoint y persistencia de templates (inicio Etapa 2).
5. UI builder y costo neural en /lab/templates (cierre Etapa 2).
6. Conexiones analiticas en workspace perfil (Etapa 3).

## 15) Ejecucion Etapa 0 (2026-04-29)

- Estado: completada.
- Alcance ejecutado: sincronizacion de apps/web/src/lib/platform/supabase-types.ts con el esquema real de supabase/bootstrap_musculacion.sql para tablas, vistas y enums del dominio Lab + Training.

### Gate de salida

- Typecheck completo en verde: npm.cmd run typecheck.
- Sin regresiones de compilacion en @musculator/contracts, @musculator/domain y @musculator/web.

### Evidencia

- Archivo tipado actualizado: apps/web/src/lib/platform/supabase-types.ts.
- Entidades tipadas incluidas: clients, muscle_groups, exercises, exercise_muscles, training_templates, training_template_entries, training_template_sets, training_protocols, training_protocol_weeks, training_protocol_week_templates, client_protocol_assignments, workout_sessions, workout_entries, workout_sets, training_ingestions.
- Vistas tipadas incluidas: v_exercise_catalog, v_workout_session_summary, v_workout_muscle_load.
- Enums tipados incluidos: stimulus_vector, movement_pattern, resistance_profile, training_session_kind, training_protocol_week_type, training_protocol_assignment_status, ingestion_source, ingestion_status, muscle_role.

## 16) Ejecucion Etapa 0.5 Camino 2 (2026-04-29)

- Estado: avanzada en codigo local y lista para aplicacion SQL remota.
- Objetivo aplicado: alinear taxonomia biomecanica base antes de construir catalogo UI del Lab.

### Paso 1 - Migracion taxonomica (completado en repo)

- Archivo creado: supabase/migrations/0002_biomechanics_taxonomy.sql.
- Cambios cubiertos:
    - movement_pattern: agrega isolation.
    - stimulus_vector: renombra fuerza_base -> fuerza y asegura amplitud/densidad/potencia/acondicionamiento.
    - resistance_profile: migra machine/specific hacia machine_constant/machine_variable/bodyweight y deja default free_weight.

### Paso 2 - Resincronizacion de fuente de verdad y tipos (completado)

- bootstrap actualizado: supabase/bootstrap_musculacion.sql.
- Tipados/contratos alineados:
    - apps/web/src/lib/platform/supabase-types.ts
    - packages/contracts/src/training.ts
    - packages/domain/src/training.ts
    - apps/web/src/components/training/workspace.tsx
    - supabase/seed.sql
- Gate aprobado:
    - npm.cmd run typecheck en verde en @musculator/contracts, @musculator/domain y @musculator/web.

### Paso 3 - Seed de 80-100 ejercicios (completado en repo)

- Archivo creado: supabase/seed_exercises.sql.
- Cobertura final: 100 ejercicios con upsert por slug.
- Ejes cubiertos:
    - movement_pattern: horizontal_push, vertical_push, horizontal_pull, vertical_pull, knee_dominant, hip_hinge, isolation, core_anti_movement, rotation_ballistic, locomotion_metabolic.
    - stimulus_vector operativo del seed: fuerza, amplitud, densidad, potencia, acondicionamiento.
    - resistance_profile: bodyweight, free_weight, cable, machine_constant, machine_variable.

### Bloqueador para cierre de etapa en base remota

- Pendiente de ejecutar en Supabase remoto: aplicacion de 0002_biomechanics_taxonomy.sql y seed_exercises.sql.
- Estado remoto verificado por API REST: public.exercises aun expone esquema viejo (sin movement_pattern, resistance_profile ni cns_tax_multiplier) y conteo actual 13 ejercicios.
- Bloqueador actual: sin sesion activa en dashboard de Supabase desde este entorno y sin credenciales directas de Postgres para aplicar SQL remoto.
- Hotfix aplicado (2026-04-29): 0002_biomechanics_taxonomy.sql ahora crea tipos faltantes si no existen (movement_pattern, stimulus_vector, resistance_profile), agrega columnas faltantes en exercises y protege alteraciones con guards de existencia para compatibilidad con esquema legacy.
- Cierre operativo requerido para marcar etapa cerrada:
    1. Ejecutar migracion 0002 en SQL Editor de Supabase.
    2. Ejecutar seed_exercises.sql.
    3. Validar conteo en public.exercises y registrar evidencia en este roadmap.

## 17) Validacion Remota Etapa 0.5 (2026-04-29)

- Estado: ejecutada y validada en Supabase remoto.
- Scripts ejecutados en remoto por usuario:
    - supabase/migrations/0002_biomechanics_taxonomy.sql
    - supabase/seed_exercises.sql

### Evidencia remota

- Conteo remoto total en public.exercises: 101.
- Cobertura movement_pattern (10): core_anti_movement, hip_hinge, horizontal_pull, horizontal_push, isolation, knee_dominant, locomotion_metabolic, rotation_ballistic, vertical_pull, vertical_push.
- Cobertura stimulus_vector (5): acondicionamiento, amplitud, densidad, fuerza, potencia.
- Cobertura resistance_profile (5): bodyweight, cable, free_weight, machine_constant, machine_variable.
- Integridad de columnas nuevas en exercises:
    - movement_pattern nulos: 0
    - resistance_profile nulos: 0
    - cns_tax_multiplier nulos: 0

### Nota de consistencia seed vs remoto

- Seed local contiene 100 slugs; remoto contiene 101 slugs.
- Diferencia detectada: 1 slug legacy adicional en remoto (machine-fly), sin faltantes respecto al seed nuevo.

## 18) Ajustes Fisiologicos y Recuperacion Dinamica (2026-04-29)

- Estado: aplicado en repo para siguiente corrida SQL.
- Objetivo: conservar taxonomia de 10 patrones y mantener recovery_time_hours como base muscular, agregando capa dinamica por sesion.

### Cambios aplicados

- Tuning puntual en seed de ejercicios (9 columnas sin cambios estructurales):
    - barbell-bench-press: cns_tax_multiplier 9.1 -> 8.5.
    - push-press: cns_tax_multiplier 9.2 -> 9.5.
    - back-squat: cns_tax_multiplier 9.4 -> 10.0.
    - bulgarian-split-squat: cns_tax_multiplier 7.2 -> 8.5.
    - romanian-deadlift: stimulus_vector fuerza -> amplitud y cns_tax_multiplier 8.8 -> 9.5.
    - conventional-deadlift: cns_tax_multiplier 9.6 -> 10.0.
- Archivo actualizado: supabase/seed_exercises.sql.
- Fuente bootstrap alineada en ejercicios compartidos: back-squat y romanian-deadlift.

### Recuperacion dinamica implementada en SQL

- Vista actualizada: v_workout_muscle_load (bootstrap + migracion).
- Reglas incorporadas:
    - Base muscular mantenida: recovery_time_hours.
    - Ponderacion por rol muscular: primary 1.00, secondary 0.60, stabilizer 0.35.
    - Factor de estimulo por stimulus_vector.
    - Normalizacion de CNS para evitar multiplicacion directa descontrolada.
    - Limites operativos de salida: minimo 18h y maximo 120h.
- Nuevas salidas de vista:
    - role_weighted_sets
    - average_cns_tax_multiplier
    - average_stimulus_factor
    - recovery_time_dynamic_hours

### Migracion puente creada

- Archivo nuevo: supabase/migrations/0003_recovery_dynamic_and_seed_tuning.sql.
- Alcance:
    - UPDATE sobre slugs criticos para tuning fisiologico en entornos ya poblados.
    - CREATE OR REPLACE de v_workout_muscle_load con la logica dinamica.

### Tipado sincronizado

- Archivo actualizado: apps/web/src/lib/platform/supabase-types.ts.
- v_workout_muscle_load incluye columnas dinamicas nuevas para consumo seguro desde app/api.

## 19) Validacion Remota Migracion 0003 (2026-04-29)

- Estado: validada en Supabase remoto.
- Script ejecutado: supabase/migrations/0003_recovery_dynamic_and_seed_tuning.sql.

### Evidencia de estructura

- v_workout_muscle_load expone contrato legacy + columnas nuevas sin romper compatibilidad.
- Columnas observadas en remoto (14):
    - session_id, user_id, muscle_slug, muscle_name, category, recovery_time_hours, total_sets, total_reps, total_load_kg, average_rpe, role_weighted_sets, average_cns_tax_multiplier, average_stimulus_factor, recovery_time_dynamic_hours.

### Evidencia de tuning aplicado

- back-squat: stimulus_vector fuerza, cns_tax_multiplier 10.0.
- barbell-bench-press: stimulus_vector fuerza, cns_tax_multiplier 8.5.
- bulgarian-split-squat: stimulus_vector amplitud, cns_tax_multiplier 8.5.
- conventional-deadlift: stimulus_vector fuerza, cns_tax_multiplier 10.0.
- push-press: stimulus_vector potencia, cns_tax_multiplier 9.5.
- romanian-deadlift: stimulus_vector amplitud, cns_tax_multiplier 9.5.

### Evidencia de recuperacion dinamica

- Rango observado recovery_time_dynamic_hours: minimo 49h, maximo 91h.
- Resultado consistente con limites operativos configurados (18h-120h).

## 20) Ejecucion Etapa 1 - Catalogo Lab UI/UX (2026-04-29)

- Estado: implementada en codigo y validada por typecheck.
- Objetivo: llevar /lab/exercises a experiencia Athlete OS mobile-first, con filtros instantaneos y detalle inmersivo.

### Entregables aplicados

- Route handler tipado creado:
    - app/api/lab/exercises/route.ts
- Capa de persistencia tipada para catalogo:
    - apps/web/src/lib/lab/persistence.ts
- UI interactiva implementada:
    - apps/web/src/components/lab/exercise-catalog.tsx
    - apps/web/src/app/(shell)/lab/exercises/page.tsx

### UX/Interaccion implementada

- Sticky header glassmorphism con buscador principal.
- Quick filters horizontales por Patron y Vector con chips activables.
- Listado mobile-first por tarjetas (sin tablas), con iconografia de patron.
- Indicador CNS Tax basado en icono de rayo y color por rango:
    - 9-10 rojo con glow.
    - 5-8 ambar.
    - menor a 5 cyan/verde.
- Badge de stimulus_vector con estilos diferenciados por tipo.
- Bottom sheet inmersivo al tocar tarjeta (sin navegar), con:
    - metrica CNS
    - recovery en horas
    - resistencia
    - tags de musculos primarios y sinergistas
- Transiciones y presencia con Framer Motion.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.

## 21) Hotfix Compatibilidad v_exercise_catalog (2026-04-29)

- Estado: aplicado en codigo + migracion correctiva creada.
- Incidente: en /lab/exercises se detecto error runtime en remoto:
    - column v_exercise_catalog.movement_pattern does not exist.
- Causa raiz: entorno con vista v_exercise_catalog en shape legacy (sin columnas biomecanicas nuevas), mientras la app ya consulta contrato expandido.

### Mitigacion inmediata en app (sin downtime)

- Archivo actualizado: apps/web/src/lib/lab/persistence.ts.
- Cambio aplicado:
    - si falla la consulta a v_exercise_catalog por columna inexistente, se activa fallback a tablas base (exercises + exercise_muscles + muscle_groups) para construir el mismo DTO del catalogo.
    - si ese fallback tambien falla por schema legado profundo, la app baja a modo preview y evita crash de pantalla.

### Correccion estructural SQL

- Archivo nuevo: supabase/migrations/0004_refresh_exercise_catalog_view.sql.
- Alcance:
    - create or replace de public.v_exercise_catalog con columnas:
      id, slug, name, movement_pattern, stimulus_vector, resistance_profile, is_compound, equipment, cns_tax_multiplier, primary_muscle_slug, primary_muscle_name, primary_muscle_category, muscle_map.
    - grant select a anon y authenticated.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web despues del hotfix.

### Gate operativo pendiente en remoto

- Ejecutar supabase/migrations/0004_refresh_exercise_catalog_view.sql en SQL Editor remoto para alinear la vista y desactivar el camino de fallback.

## 22) Ajuste de Ejecucion SQL para 0004 (2026-04-29)

- Estado: aplicado en repo.
- Incidente detectado al ejecutar 0004 en remoto:
    - ERROR 42P16 cannot change name of view column stimulus_vector to movement_pattern.
- Causa: CREATE OR REPLACE VIEW intento reemplazar una version legacy de v_exercise_catalog con orden/shape de columnas diferente.

### Correccion aplicada

- Archivo ajustado: supabase/migrations/0004_refresh_exercise_catalog_view.sql.
- Cambio: reemplazo de estrategia a recreacion limpia:
    - drop view if exists public.v_exercise_catalog;
    - create view public.v_exercise_catalog as ...

### Resultado esperado

- La migracion 0004 puede ejecutarse sin conflicto de renombrado implicito de columnas.
- El contrato final de v_exercise_catalog queda normalizado para Etapa 1.

## 23) Remediacion Binding + Overhaul Athlete OS (2026-04-29)

- Estado: aplicado en codigo y validado en runtime local.
- Objetivo: corregir perdida de sinergistas en detalle y rehacer /lab/exercises con estetica Athlete OS de alto contraste.

### Data Binding corregido

- Archivo actualizado: apps/web/src/lib/lab/persistence.ts.
- Mejoras aplicadas:
        - parseMuscleMap ahora soporta JSONB como array y tambien payload serializado string.
        - mapeo tolerante de claves legacy/alternas (slug o muscle_slug, name o muscle_name).
        - deduplicacion por slug+role para evitar ruido en tags.
        - route/page marcados force-dynamic y revalidate=0 para evitar stale cache:
            - apps/web/src/app/api/lab/exercises/route.ts
            - apps/web/src/app/(shell)/lab/exercises/page.tsx

### UI/UX overhaul aplicado

- Archivo actualizado: apps/web/src/components/lab/exercise-catalog.tsx.
- Cambios clave:
        - tema dark high contrast (base zinc) y layout visual Athlete OS.
        - chips inactivos bg-zinc-800 text-zinc-400 y activos bg-white text-black.
        - ExerciseCard separado con fondo bg-zinc-900, border-zinc-800, rounded-xl.
        - CNS badge agresivo por rango:
            - menor a 5: cyan.
            - 5 a 8: amber.
            - mayor a 8: rojo con texto blanco.
        - titulo de ejercicio reforzado con font-bold text-lg tracking-tight.
        - ExerciseSheet separado con metricas en cajas solidas:
            - bg-zinc-800/50 rounded-lg p-3 border border-white/5.
        - tags tecnicos para primarios/sinergistas (uppercase tracking y borde/acento).

### Script QA para sinergistas (5 ejercicios)

- Archivo nuevo: supabase/migrations/0005_seed_exercise_synergists_sample.sql.
- Inserta relaciones en exercise_muscles para pruebas visuales de Bottom Sheet en:
        - back-squat
        - barbell-bench-press
        - barbell-row
        - overhead-press
        - romanian-deadlift

### Evidencia

- Typecheck verde: npm.cmd run typecheck.
- Verificacion de UI en runtime local: Bottom Sheet muestra sinergistas (ejemplo back-squat con Core y Gluteo).

## 24) Cierre Etapa 1 - Interfaz Elite de Datos (2026-04-29)

- Estado: aplicado en codigo y validado.
- Objetivo: convertir /lab/exercises en interfaz profesional de alta densidad, clara y orientada a lectura rapida para toma de decisiones.

### Buscador Spotlight (Apple-like)

- Archivo actualizado: apps/web/src/components/lab/exercise-catalog.tsx.
- Implementado:
    - input centrado con backdrop-blur-md, bg-zinc-900/50 y borde sutil border-zinc-800.
    - atajo Cmd+K / Ctrl+K para enfocar y seleccionar el buscador.
    - filtrado realtime por nombre, musculo y patron.

### Lista densa con headers sticky por patron

- Estructura aplicada por fila:
    - izquierda: nombre bold + musculo principal muted.
    - derecha: badge de vector completo y luego indicador CNS con rayo.
- Agrupamiento sticky por movement_pattern con conteo por bloque.

### Semaforo CNS y badge de vector

- Indicador CNS (Zap) con formato visual: ⚡ valor.
- Rangos aplicados:
    - mayor a 8.5: rojo/rosa neon.
    - 5.0 a 8.4: naranja/ambar.
    - menor a 5.0: cyan/verde neon.
- Badges de vector con palabra completa:
    - FUERZA, AMPLITUD, DENSIDAD, POTENCIA, ACONDICIONAMIENTO.

### Intel Sheet data-heavy

- Bottom sheet rehacido con enfoque tecnico:
    - metricas en cards minimalistas.
    - lista de primarios y sinergistas con tags tecnicos.
    - fallback explicito cuando no hay sinergistas:
      - Sin sinergistas registrados.

### Gate tecnico y funcional

- Typecheck en verde para @musculator/web.
- Validacion manual:
    - shortcut Ctrl+K enfoca buscador.
    - headers sticky por patron visibles.
    - sinergistas renderizados desde muscle_map y fallback textual correcto cuando vacio.

## 25) Sistema de Filtrado Tactico (Anti-Bloat) (2026-04-29)

- Estado: aplicado y validado en runtime.
- Objetivo: aumentar control de exploracion sin ruido visual, manteniendo interfaz densa y legible.

### Barra de filtros minimalista en header sticky

- Archivo actualizado: apps/web/src/components/lab/exercise-catalog.tsx.
- Implementado debajo del buscador Spotlight:
    - Patron: dropdown oscuro.
    - Vector: dropdown oscuro.
    - Equipamiento: dropdown oscuro (Barra, Mancuerna, Maquina, Cable).
- Estetica anti-bloat:
    - selectores textuales con ChevronDown.
    - sin botones de fondo solido.
    - menu compacto bg-zinc-900 y borde sutil.

### Estado activo y feedback

- Si un filtro != Todos, el label del filtro se resalta con acento (cyan) para visibilidad de contexto.
- Contador dinamico mantenido y conectado a filtros + busqueda en tiempo real.

### Performance de filtrado

- Filtrado y agrupamiento calculados con useMemo para respuesta instantanea sobre 100+ ejercicios.
- Cierre de dropdown por click externo y tecla Escape para interaccion limpia.

### Refinamiento Intel Sheet

- Header del sheet reagrupado.
- Boton de cierre (X) mejor integrado con estilo circular definido:
    - bg-zinc-800/50 y borde mas visible.

### Evidencia funcional

- Caso validado: Vector = FUERZA reduce listado a 13 ejercicios visibles y conserva agrupamiento sticky por patron.

## 26) Plan de Refactor Arquitectonico Home vs Lab (2026-04-29)

- Estado: en ejecucion por etapas con commit por cierre.
- Objetivo: eliminar duplicidad Home/Lab, unificar navegacion por rutas reales y dejar Home enfocado en perfil + telemetria.

### Alcance de refactor

- Centralizar Training Lab en /lab/* como unica fuente de verdad para catalogo, rutinas y protocolos.
- Limpiar Home / para que no renderice superficie Lab administrativa embebida.
- Unificar el modelo de navegacion desktop/mobile para que ambos dependan de rutas reales.
- Conservar modo live operativo, pero desacoplado del tab local que mezclaba superficies.

### Etapas, gates y evidencia esperada

#### Etapa R1 - Home limpio y separacion inicial de superficies

- Acciones:
    - Home / pasa a renderizar solo perfil/telemetria en layout shell.
    - Se retira el mega workspace como superficie principal de Home.
    - Se mantiene /lab/* como superficie administrativa separada.
- Gate tecnico:
    - npm.cmd run typecheck en verde.
    - Home renderiza sin errores y sin tab local de Lab embebido.
- Evidencia a registrar:
    - Archivos tocados.
    - Resultado de typecheck.
    - Commit de cierre R1.

#### Etapa R2 - Navegacion real mobile/desktop

- Acciones:
    - Mobile navigation deja de mutar estado local para cambiar "Lab" y navega por rutas.
    - Desktop y mobile convergen en la misma arquitectura de rutas principales.
    - Se normaliza la entrada a Lab desde navegacion principal.
- Gate tecnico:
    - npm.cmd run typecheck en verde.
    - Navegacion mobile y desktop consistente hacia / y /lab.
- Evidencia a registrar:
    - Archivos tocados.
    - Resultado de typecheck.
    - Commit de cierre R2.

#### Etapa R3 - Limpieza estructural final y compatibilidad

- Acciones:
    - Se eliminan alias y restos de arquitectura previa que generaban ambiguedad.
    - Se alinean enlaces legacy y superficies auxiliares con la nueva jerarquia.
    - Se valida la experiencia completa de rutas clave antes de cerrar refactor.
- Gate tecnico:
    - npm.cmd run typecheck en verde.
    - Smoke manual de /, /lab/exercises, /lab/templates, /lab/protocols sin regresiones.
- Evidencia a registrar:
    - Archivos tocados.
    - Resultado de typecheck.
    - Commit de cierre R3.

### Regla operativa de ejecucion

- Cada etapa se implementa, se valida, se commitea y recien entonces se avanza a la siguiente.
- No se revierte informacion historica previa en roadmap; solo se agregan resultados y evidencias.

## 27) Ejecucion Etapa R1 - Home limpio y separacion inicial (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: Home / queda enfocada en perfil + telemetria y deja de montar TrainingWorkspace como superficie principal.

### Cambios aplicados

- Archivo actualizado: apps/web/src/app/(shell)/page.tsx.
- Accion:
    - reemplazo de TrainingWorkspace por AppShell + ProfileDashboard.
    - eliminacion de dependencias de createTrainingTemplateSession y getSetupChecklist en Home.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Verificacion runtime de Home en http://localhost:3000:
    - renderiza "Perfil y telemetria" en shell compartido.
    - no aparece tab local de Lab embebido en Home.

### Evidencia

- Snapshot funcional validado en navegador para / con contenido de ProfileDashboard.
- Commit de cierre R1: eb9e9c4 (refactor(shell): stage r1 home profile-only surface).

## 28) Ejecucion Etapa R2 - Navegacion real mobile/desktop (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: mobile y desktop convergen en navegacion principal por rutas reales (/, /lab) sobre shell compartido.

### Cambios aplicados

- Archivo nuevo: apps/web/src/components/navigation/mobile-route-nav.tsx.
- Archivo actualizado: apps/web/src/components/navigation/app-shell.tsx.
- Accion:
    - se agrega barra mobile global con links reales a / y /lab.
    - AppShell monta MobileRouteNav para reutilizar el mismo patron en Home y en /lab/*.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Verificacion runtime:
    - / renderiza nav mobile con Inicio y Lab.
    - /lab/exercises mantiene interfaz del catalogo y conserva navegacion route-based.

### Evidencia

- Snapshot funcional de / con barra mobile route-based activa.
- Snapshot funcional de /lab/exercises con shell + tabs + catalogo operativo.
- Commit de cierre R2: 309622b (refactor(nav): stage r2 route-based mobile shell nav).

## 29) Ejecucion Etapa R3 - Limpieza estructural final y compatibilidad (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: se elimina ambiguedad de /dashboard como Home, se alinean enlaces legacy y se normalizan defaults de auth con la nueva jerarquia.

### Cambios aplicados

- Archivo actualizado: apps/web/src/app/(shell)/dashboard/page.tsx.
    - /dashboard ahora redirige a /lab (compatibilidad legacy orientada a Lab).
- Archivo actualizado: apps/web/src/components/navigation/site-header.tsx.
    - enlaces "Training Lab" y CTA pasan de /dashboard a /lab.
- Archivo actualizado: apps/web/src/components/navigation/app-nav.tsx.
    - Home activo solo en /.
    - compatibilidad visual para alias /dashboard tratandolo como Lab.
- Archivo actualizado: apps/web/src/components/navigation/mobile-route-nav.tsx.
    - misma logica de activo que desktop para / y /lab.
- Archivos actualizados de auth:
    - apps/web/src/app/sign-in/page.tsx
    - apps/web/src/app/auth/callback/route.ts
    - apps/web/src/components/auth/sign-in-form.tsx
    - fallback de redireccion pasa a / (sin dependencia de /dashboard).

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Smoke manual en runtime:
    - /dashboard redirige a /lab/exercises.
    - / mantiene Home de perfil/telemetria.
    - /lab/exercises, /lab/templates y /lab/protocols operativos bajo shell comun + nav mobile route-based.

### Evidencia

- Snapshots funcionales validados para /, /dashboard, /lab/exercises, /lab/templates y /lab/protocols.
- Commit de cierre R3: 52481fe (refactor(routes): stage r3 cleanup dashboard legacy).

## 30) Cierre Refactor Home-Lab por Etapas (2026-04-29)

- Estado: completado.
- Resultado:
    - Home / separada de Lab administrativo.
    - Lab centralizado en /lab/* con layout y tabs por rutas reales.
    - Navegacion mobile/desktop unificada en rutas principales.
    - Compatibilidad legacy controlada via redireccion de /dashboard hacia /lab.
    - Defaults de auth alineados a / para evitar acoplamiento con alias legacy.

### Commits de ejecucion

- R1: eb9e9c4 - refactor(shell): stage r1 home profile-only surface.
- R2: 309622b - refactor(nav): stage r2 route-based mobile shell nav.
- R3: 52481fe - refactor(routes): stage r3 cleanup dashboard legacy.

## 31) Ajuste Post-Refactor Solicitado - Restauracion Dashboard Home Original (2026-04-29)

- Estado: completada.
- Motivo: se solicita volver al dashboard Home previo al refactor (TrainingWorkspace completo) manteniendo intacta la arquitectura nueva de Lab.

### Cambios aplicados

- Archivo actualizado: apps/web/src/app/(shell)/page.tsx.
- Accion:
    - restauracion exacta de Home pre-refactor con TrainingWorkspace + AppNav.
    - se conserva sin cambios la arquitectura de Lab en /lab/* y las mejoras de rutas/compatibilidad aplicadas en R2/R3.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Smoke manual en runtime:
    - / vuelve a mostrar el dashboard original completo (perfil, telemetria, bloques operativos).
    - /lab/exercises se mantiene operativo con la interfaz actual.

### Evidencia

- Snapshot funcional validado para / con dashboard original restaurado.
- Snapshot funcional validado para /lab/exercises sin regresiones.
- Commit de cierre: 348dbd3 (fix(shell): restore pre-refactor home dashboard).

## 32) Ajuste UX App-Like Home Perfil + Lab Nuevo (2026-04-29)

- Estado: completada.
- Objetivo: conservar Home con el perfil actual y hacer que Lab, desde Home, abra el nuevo /lab/exercises en navegacion cliente tipo app.

### Cambios aplicados por etapas

#### Etapa A - Preservacion de Home

- Confirmado sin cambios funcionales en Home:
    - se mantiene TrainingWorkspace como superficie principal en /.
    - la experiencia de Perfil/telemetria permanece intacta.

#### Etapa B - Enrutado de Lab al nuevo catalogo

- Archivo actualizado: apps/web/src/components/training/workspace.tsx.
    - boton superior Lab del dashboard ahora navega a /lab/exercises.
    - selector local de superficies queda para profile/nutrition/clients.
- Archivo actualizado: apps/web/src/components/training/mobile-tab-bar.tsx.
    - tab Lab de la barra inferior pasa a Link cliente hacia /lab/exercises.
    - Perfil y Nutricion siguen funcionando como tabs internos del workspace.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Smoke funcional por etapas:
    - / mantiene dashboard Home actual sin regresiones.
    - click en tab Lab desde Home navega a /lab/exercises.
    - /lab/exercises conserva el catalogo nuevo operativo.

### Evidencia

- Validacion de URL tras click en tab Lab desde Home: http://localhost:3000/lab/exercises.
- Snapshot runtime en / con Perfil intacto.
- Snapshot runtime en /lab/exercises tras navegacion desde Home.
- Commit de cierre: 52320f4 (feat(home-lab): route lab tab to new exercises surface).

## 33) Plan de Refactor Unificado Single-App (2026-04-29)

- Estado: planificado (sin implementacion en esta etapa).
- Objetivo: unificar Home + Lab en una sola experiencia app-like dentro de /, sin redirecciones de pagina al cambiar entre Perfil y Lab.

### Reglas de producto (bloqueantes)

- No navegar a /lab/exercises al tocar Lab en Home.
- Mantener / como superficie principal con cambio interno por estado (Perfil, Lab, Nutricion, Live).
- Evitar doble navbar: se conserva solo la navegacion base de Home.
- Reutilizar el catalogo nuevo de Lab Exercises dentro del panel Lab interno.
- Unificar estilos para evitar choque visual entre tema Home y tema Lab actual.

### Arquitectura objetivo

- Workspace unico en / con paneles internos.
- Panel Lab interno monta el nuevo catalogo como componente embebido, no como pagina externa.
- Navegacion principal (desktop y mobile) controla panel interno, no rutas para Perfil/Lab.
- /lab/* queda como superficie administrativa opcional (backoffice), no flujo primario del dia a dia.

### Etapas de ejecucion propuestas

#### Etapa U1 - Desacople de datos y componente de catalogo

- Meta:
    - separar la logica visual del catalogo nuevo para poder montarla dentro de Home/Lab interno.
- Acciones:
    - extraer una variante embebible del catalogo (sin header/shell externo duplicado).
    - preparar adaptador para consumir los mismos datos en contexto interno.
- Gate:
    - typecheck en verde.
    - catalogo embebible renderiza en story/local test sin navbar duplicado.
- Evidencia esperada:
    - lista de archivos refactorizados.
    - captura del componente embebido aislado.

#### Etapa U2 - Integracion del nuevo Lab dentro de Home

- Meta:
    - al tocar Lab en Home, mostrar el nuevo catalogo dentro del mismo localhost raiz.
- Acciones:
    - reemplazar contenido actual del panel Lab interno por catalogo nuevo embebido.
    - conservar Perfil y Nutricion como paneles internos.
    - eliminar cualquier push/redirect al pasar a Lab desde Home.
- Gate:
    - click en Lab no cambia ruta (permanece en /).
    - panel Lab muestra el catalogo nuevo completo.
    - Perfil mantiene comportamiento actual sin regresion.
- Evidencia esperada:
    - video corto o checklist de flujo Perfil -> Lab -> Perfil en misma ruta.

#### Etapa U3 - Unificacion visual y de navegacion

- Meta:
    - coherencia total de estilos y navegacion en toda la experiencia raiz.
- Acciones:
    - normalizar paleta, bordes, tipografia y densidad entre paneles.
    - retirar elementos de navegacion redundantes en modo embebido.
    - asegurar consistencia desktop/mobile en tabs internos.
- Gate:
    - no hay segundo navbar visible al entrar en Lab interno.
    - Home y Lab comparten sistema visual coherente.
    - smoke funcional completo en / (Perfil, Lab, Nutricion, Live).
- Evidencia esperada:
    - capturas comparativas antes/despues.
    - checklist UI/UX aprobado.

### Riesgos y mitigacion

- Riesgo: duplicacion de logica entre /lab/* y Lab interno.
    - Mitigacion: usar componente base unico con wrappers de contexto.
- Riesgo: regresion de rendimiento en Home por catalogo pesado.
    - Mitigacion: memoizacion, render por secciones y controles de virtualizacion si hace falta.
- Riesgo: inconsistencias visuales persistentes.
    - Mitigacion: definir tokens visuales comunes antes de U3.

### Orden de implementacion recomendado

1. U1 (desacople).
2. U2 (integracion interna sin redireccion).
3. U3 (unificacion visual final).

### Criterio de cierre

- El usuario navega todo el flujo diario en / como app unica.
- Lab interno muestra el nuevo catalogo sin cambiar de pagina.
- No aparece navbar extra al abrir Lab desde Home.

## 34) Ejecucion Etapa U1 - Desacople de Catalogo Embebible (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: separar el catalogo nuevo en modo reutilizable para Home interno y /lab/exercises sin duplicar logica de datos ni UI.

### Cambios aplicados

- Archivo actualizado: apps/web/src/components/lab/exercise-catalog.tsx.
    - se agrega soporte de variante visual reusable con props variant y className.
    - se mantiene contrato base de datos via initialData para uso server-side.
- Archivo nuevo: apps/web/src/components/lab/embedded-exercise-catalog.tsx.
    - adaptador cliente para consumir /api/lab/exercises con cache no-store.
    - fallback defensivo a estado preview vacio y mensaje de error no bloqueante.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Smoke runtime en /lab/exercises sin regresiones visibles de catalogo, filtros ni listado.

### Evidencia

- Lista de archivos refactorizados para U1:
    - apps/web/src/components/lab/exercise-catalog.tsx
    - apps/web/src/components/lab/embedded-exercise-catalog.tsx
- El adaptador embebible queda listo para integrar en Home en la etapa U2 sin usar redireccion de ruta.
- Commit de cierre U1: b09f915 (refactor(lab): stage u1 embeddable catalog core).

## 35) Ejecucion Etapa U2 - Integracion Lab Interno en Home (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: al tocar Lab en Home, la app permanece en / y renderiza el catalogo nuevo embebido como panel interno.

### Cambios aplicados

- Archivo actualizado: apps/web/src/components/training/workspace.tsx.
    - Lab desktop deja de usar Link y pasa a selector interno de superficie.
    - se integra EmbeddedExerciseCatalog como panel Lab interno en el flujo principal.
    - selectDashboardSurface y mobileActiveTab ahora contemplan lab como tab interna.
- Archivo actualizado: apps/web/src/components/training/mobile-tab-bar.tsx.
    - tab Lab deja de navegar por ruta y usa onSelectTab igual que Perfil/Nutricion.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Smoke funcional en runtime:
    - URL se mantiene en http://localhost:3000/ al seleccionar Lab.
    - el panel interno muestra marcador de integracion "Lab integrado" y el catalogo nuevo con buscador/filtros.

### Evidencia

- Flujo validado: Perfil -> Lab -> (catalogo nuevo) sin redireccion fuera de /.
- Marcadores visibles en la misma ruta:
    - "Lab integrado"
    - "Catalogo interno sin cambio de ruta"
    - buscador "Buscar por nombre, musculo o patron".
- Commit de cierre U2: 87505fc (feat(home): stage u2 embed lab inside root workspace).

## 36) Ejecucion Etapa U3 - Unificacion Visual y Navegacion (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: unificar la estetica del Lab embebido con Home y asegurar una sola navegacion visible dentro de / para el flujo diario.

### Cambios aplicados

- Archivo actualizado: apps/web/src/components/lab/exercise-catalog.tsx.
    - se agregan tokens visuales por variante embedded/standalone para mantener un solo core de componente.
    - header sticky, input, dropdowns, headers de seccion y estados vacios del modo embebido pasan al lenguaje visual de Home.
    - se conserva modo standalone para /lab/exercises sin romper backoffice.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.
- Smoke funcional en runtime (modo Lab interno):
    - URL permanece en http://localhost:3000/.
    - no aparecen tabs administrativos duplicados (Rutinas/Protocolos) en Home.
    - se mantiene una sola navegacion principal de app (bottom tabs Perfil/Lab/Nutricion + Live).

### Evidencia

- Marcadores confirmados en Home Lab interno:
    - "Lab integrado"
    - "Catalogo interno sin cambio de ruta"
    - "101 ejercicios visibles".
- Verificacion de no navbar duplicada en modo embebido: ausencia de labels "Rutinas" y "Protocolos" en la vista /.

## 37) Estandarizacion Mobile App Shell + Scroll (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: resolver bloqueo de scroll y friccion de navegacion en vista movil de Perfil/Home para consolidar comportamiento app-like estable.

### Diagnostico raiz

- Home en / combinaba altura fija de viewport + contenedores con overflow, generando un scroll trap en moviles.
- El flujo principal dependia de scroll anidado en lugar de scroll natural de documento.
- La barra inferior fija no contemplaba safe-area de dispositivos modernos.

### Cambios aplicados

- Archivo actualizado: apps/web/src/app/(shell)/page.tsx.
    - se elimina bloqueo de overflow general.
    - se reemplaza altura fija por min-height mobile-safe (svh).
- Archivo actualizado: apps/web/src/components/training/workspace.tsx.
    - se elimina scroll anidado de dashboard.
    - el contenido vuelve a scroll natural de pagina y reserva espacio inferior para navbar fija.
- Archivo actualizado: apps/web/src/components/training/mobile-tab-bar.tsx.
    - posicion inferior adaptada con safe-area inset.
- Archivo actualizado: apps/web/src/app/globals.css.
    - estandar base de scroll vertical en body y bloqueo de overflow horizontal.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.

### Gate funcional (runtime movil)

- Scroll vertical confirmado en /:
    - antes: y=0.
    - despues de wheel/touch simulation: y=1600.
    - scrollHeight 6195 > innerHeight 368.
- Navegacion movil confirmada sin cambio de ruta:
    - tab Lab activa heading "Lab" manteniendo URL http://localhost:3000/.
    - tab Nutricion activa heading "Nutricion" manteniendo URL http://localhost:3000/.

### Evidencia

- Se restablece flujo app movil continuo en Perfil/Home con scroll utilizable.
- Se mantiene arquitectura single-app por tabs internas (Perfil/Lab/Nutricion/Live) en la ruta raiz.

## 38) Hardening de Fit Visual Mobile (2026-04-29)

- Estado: completada.
- Objetivo ejecutado: eliminar recortes visuales residuales en Home/Perfil para que el layout entre completo en pantallas angostas sin navegacion horizontal.

### Ajustes aplicados

- Archivo actualizado: apps/web/src/components/training/workspace.tsx.
    - se agrega min-w-0 en contenedores clave del dashboard para evitar ensanche por contenido interno.
    - hero principal mobile reduce densidad (padding, radio y avatar) para evitar clipping lateral.
    - heading del perfil pasa a break-words y escala responsiva (text-2xl -> sm:text-3xl -> md:text-5xl).
    - header mobile superior endurecido con truncate/min-w-0/shrink-0 para evitar empuje de layout por boton Clientes.

### Gate tecnico

- npm.cmd run typecheck en verde para @musculator/contracts, @musculator/domain y @musculator/web.

### Evidencia funcional

- Home / en vista mobile mantiene tabs internas y contenido sin desborde horizontal global.
- Perfil renderiza bloque hero y metrica principal sin cortes de texto por ancho.