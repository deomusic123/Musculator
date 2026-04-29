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