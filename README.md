# Musculator

Musculator es una plataforma para seguimiento de nutricion de alta precision y entrenamiento biomecanico con soporte para ingesta asistida por IA.

## Decisiones base

- Cliente inicial: Next.js como PWA con App Router y TypeScript.
- Backend: Supabase como fuente de verdad para auth, base de datos, storage y edge functions.
- Orquestacion externa: n8n para audio, transcripcion y pipelines de IA que no conviene acoplar al frontend.
- Arquitectura: monorepo liviano con modulos de dominio compartidos y contratos tipados.

## Estructura

```text
apps/
  web/                # Cliente web y capa BFF para la PWA
packages/
  contracts/          # Esquemas Zod y contratos compartidos
  domain/             # Logica pura del dominio
supabase/
  migrations/         # SQL versionado
  seed.sql            # Seed de catalogos base
n8n/
  prompts/            # Prompts versionados
  README.md           # Limites operativos del workflow
```

## Arranque local

1. Instalar dependencias con `npm install`.
2. Crear `apps/web/.env.local` a partir de `apps/web/.env.example`.
3. Ejecutar `npm run dev`.

## Scripts utiles

- `npm run dev`: levanta la PWA.
- `npm run build`: compila la aplicacion web.
- `npm run lint`: ejecuta lint sobre `apps/web`.
- `npm run typecheck`: valida tipos en contratos, dominio y web.

## Documentacion

- Ver `arquitectura_base.md` para la arquitectura objetivo.
- Ver `docs/env-policy.md` para la politica de secretos y variables.
