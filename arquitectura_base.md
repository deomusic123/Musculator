# Arquitectura Base de Musculator

## 1. Lectura critica del roadmap

El roadmap tiene una direccion correcta: la base de datos como fuente de verdad, foco en friccion cero y una separacion clara entre nutricion, entrenamiento y analitica. Las tres decisiones mas fuertes del documento son validas y conviene conservarlas:

- Supabase como backend operativo central.
- Next.js PWA como primer cliente, dejando Expo para una segunda fase.
- IA usada como acelerador de ingreso, no como reemplazo de validaciones duras.

Tambien hay tres puntos que conviene corregir desde el inicio para evitar deuda estructural:

1. `workout_logs` no debe ser el modelo canonico.
   Esa tabla sirve como tabla de aterrizaje o para un MVP muy corto, pero queda corta para series heterogeneas, rounds de boxeo, ejercicios con sets dispares, analitica por set y trazabilidad de ingesta NLP. El modelo canonico debe separarse en sesion, entrada y set.

2. n8n no deberia insertar directo en tablas finales sin validacion adicional.
   El workflow puede transcribir y estructurar, pero la persistencia final debe pasar por contratos tipados y validaciones de dominio. Si no, cualquier drift del prompt o de un proveedor rompe integridad historica.

3. `pgvector` necesita una estrategia de embedding versionada.
   La dimension del vector queda acoplada al modelo elegido. Hay que fijar desde el principio el proveedor de embeddings del MVP y guardar `embedding_model` para no mezclar vectores incompatibles.

## 2. Arquitectura recomendada

La mejor relacion entre velocidad y mantenibilidad para este producto es un **modular monolith** dentro de un monorepo liviano.

No recomiendo microservicios para el arranque porque:

- agregan complejidad operativa antes de tener volumen real,
- obligan a versionar contratos demasiado temprano,
- multiplican superficies de fallo en un producto que todavia esta afinando su dominio.

### Topologia objetivo

```text
apps/web (Next.js PWA)
  -> usa packages/contracts y packages/domain
  -> habla con Supabase para auth, lectura y escritura controlada
  -> expone route handlers o server actions para integraciones seguras

supabase
  -> postgres + rls + storage + edge functions
  -> fuente de verdad para catalogos, sesiones, comidas y analitica

n8n
  -> pipelines de audio/texto/vision
  -> nunca define el dominio, solo orquesta proveedores y transforma payloads

futuro apps/mobile (Expo)
  -> reusa contracts/domain y consume los mismos limites de backend
```

## 3. Capas y limites

### 3.1 Cliente web

- App Router y React Server Components por defecto.
- Client Components solo para camara, formularios complejos, audio y UI altamente interactiva.
- Server Actions o Route Handlers para cualquier operacion que use secretos o requiera auditoria.

### 3.2 Dominio compartido

La logica que define reglas del producto no debe vivir dispersa entre componentes o SQL ad hoc. Conviene compartirla en un paquete propio:

- calculo de readiness score,
- reglas de fatiga central y periferica,
- heuristicas de sugerencias nutricionales,
- normalizacion de payloads de entrenamiento.

### 3.3 Contratos compartidos

Todo payload que cruce limites debe estar versionado y validado con Zod:

- request/responses del frontend,
- payloads de n8n,
- estructuras recibidas desde proveedores de IA,
- DTOs internos que persisten en Supabase.

### 3.4 Persistencia

Supabase guarda el modelo canonico. El criterio es simple:

- tablas transaccionales para hechos historicos,
- tablas de catalogo para conocimiento estable,
- tablas de ingesta para payloads crudos y trazabilidad,
- vistas o funciones SQL para analitica derivada.

## 4. Modelado de datos recomendado

### 4.1 Entrenamiento

Modelo canonico:

- `workout_sessions`: la sesion completa.
- `workout_entries`: cada bloque o ejercicio dentro de la sesion.
- `workout_sets`: cada serie o round.
- `training_ingestions`: payload crudo de audio/texto y resultado del parser.

Catalogos:

- `muscle_groups`
- `exercises`
- `exercise_muscles`

Con esto podes soportar:

- pesas y boxeo en la misma sesion,
- RPE por set,
- variaciones de volumen reales,
- recalculo posterior de readiness sin perder granularidad.

### 4.2 Nutricion

Modelo canonico:

- `meal_logs`: una comida registrada.
- `meal_detections`: detecciones del modelo de vision.
- `meal_items`: items confirmados por el usuario.
- `foods`: catalogo nutricional normalizado con embeddings.

Punto importante: la vision debe proponer candidatos, no escribir macros finales sin confirmacion. El peso confirmado por usuario o sensor es la variable dura del MVP.

## 5. Modulos funcionales

Los modulos del producto deberian cortarse asi:

- `auth`: onboarding, sesion, perfil.
- `training`: sesiones, ejercicios, series, ingesta NLP.
- `nutrition`: comidas, detecciones, gramajes, lookup semantico.
- `readiness`: score, fatiga, recomendaciones.
- `analytics`: radares, historicos, balance de vectores.
- `platform`: env, logging, errores, clientes externos.

Cada modulo debe tener, como minimo:

- tipos/contratos,
- use cases,
- adaptadores externos,
- componentes UI si aplica.

## 6. Patrones y practicas

### Patrones de diseno

- **Ports and Adapters:** usar puertos para Supabase, n8n y proveedores de IA. Evita acoplar el dominio a SDKs.
- **Use Case Services:** cada accion importante vive en una funcion de aplicacion explicita, no dentro de componentes.
- **Repository solo en los bordes:** sirve para catalogos y entidades persistentes, pero no hay que esconder SQL util detras de abstracciones artificiales.
- **Schema-first validation:** todo input externo se valida antes de tocar el dominio.
- **Event trail ligero:** conservar payload original de NLP/Vision para auditoria y reproceso.

### Practicas operativas

- TypeScript estricto en todo el workspace.
- Migraciones SQL versionadas y revisables.
- RLS activado desde el primer dia.
- Logs estructurados para workflows y errores de parsing.
- CI con lint, typecheck y build.
- Sin secretos en cliente, sin service role fuera de backend seguro.

## 7. Manejo de variables, scopes y API keys

La regla central es: **cada variable existe solo en el scope minimo necesario**.

| Scope | Donde vive | Quien puede leerla | Ejemplos | Regla |
| --- | --- | --- | --- | --- |
| Publico cliente | `apps/web/.env.local` o plataforma de deploy | navegador y servidor web | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | solo valores no sensibles |
| Servidor web | `apps/web/.env.local` o variables del deploy | Route Handlers y Server Actions | `N8N_WORKOUT_WEBHOOK_URL`, `N8N_WORKOUT_WEBHOOK_SECRET` | nunca usar prefijo `NEXT_PUBLIC_` |
| Supabase Edge Functions | secretos del proyecto Supabase | edge functions | `OPENAI_API_KEY`, `EMBEDDING_MODEL`, `VISION_API_KEY` | no duplicar salvo necesidad real |
| n8n | credenciales propias de n8n | workflows | `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | usar credential store, no texto plano en workflow |
| CI/CD | secretos de GitHub o plataforma | pipelines | `VERCEL_TOKEN`, `SENTRY_AUTH_TOKEN` | uso exclusivo de automatizacion |

Reglas no negociables:

1. `SUPABASE_SERVICE_ROLE_KEY` nunca entra en el navegador.
2. Ninguna API key de IA va en `NEXT_PUBLIC_*`.
3. El frontend no llama directo a proveedores de IA con credenciales del proyecto.
4. Cada secreto sensible debe tener un owner claro: web server, edge function o n8n.
5. Los secretos de un proveedor deben rotarse sin tocar codigo de cliente.

## 8. Estrategia de frontend

Para el primer corte haria esto:

- Next.js con App Router.
- PWA para aprovechar camara, instalacion y offline parcial.
- Tailwind para velocidad, pero con tokens propios y layout consistente.
- Recharts mas adelante para analitica, no en el arranque del shell.

Regla importante: **server-first UI**. El cliente solo hidrata donde hace falta. Esto reduce complejidad y evita meter toda la logica en el browser.

## 9. Estrategia de backend

### Lo que si iria en Supabase

- auth,
- postgres,
- storage,
- RLS,
- edge functions para tareas seguras y cercanas a datos,
- `pgvector` para lookup semantico.

### Lo que no pisaria de entrada dentro de Supabase

- orquestacion compleja de audio y prompts,
- pipelines con branching alto,
- secuencias experimentales de IA.

Eso vive mejor en n8n o en una capa de aplicacion controlada.

## 10. Testing y calidad

La piramide recomendada para este proyecto:

- Unit tests para `packages/domain`.
- Contract tests para `packages/contracts`.
- Integration tests para route handlers y SQL critico.
- E2E para los flujos de mayor valor: registrar comida, registrar entrenamiento, ver readiness.

Herramientas que agregaria despues del primer corte funcional:

- Vitest para dominio.
- Playwright para E2E.
- Sentry para errores.
- PostHog o equivalente para eventos de producto.

## 11. Orden real de ejecucion

1. Cerrar el modelo SQL y RLS.
2. Versionar contratos y logica de dominio.
3. Levantar shell web con auth y dashboard minimo.
4. Implementar nutricion manual asistida por vision.
5. Implementar pipeline NLP hacia `training_ingestions` y desde ahi normalizar.
6. Calcular readiness y exponer analitica.
7. Agregar Expo cuando el dominio y contratos ya esten estables.

## 12. Decision final

Si tuviera que arrancar hoy, armaria el proyecto asi:

- monorepo liviano con npm workspaces,
- `apps/web` como primer cliente,
- paquetes compartidos de contratos y dominio,
- Supabase como backend canonico,
- n8n como orquestador externo,
- variables separadas por scope,
- SQL y RLS antes que features vistosas.

Eso te deja margen para iterar rapido sin romper el modelo ni exponer secretos donde no deben estar.
