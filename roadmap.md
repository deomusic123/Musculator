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