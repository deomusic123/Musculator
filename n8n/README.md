# n8n boundary

n8n existe para orquestar audio, transcripcion, prompts y llamadas a proveedores.

## Regla de oro

n8n no es la fuente de verdad del dominio. El workflow debe:

1. recibir audio o texto,
2. transcribir si hace falta,
3. producir JSON valido segun `@musculator/contracts`,
4. escribir primero en una tabla de ingesta o pasar por una ruta segura del backend,
5. dejar trazabilidad del payload original.

## Secretos

- `OPENAI_API_KEY` o proveedor equivalente: credential store de n8n.
- `SUPABASE_SERVICE_ROLE_KEY`: solo si el workflow realmente necesita persistir sin pasar por el backend web.
- `N8N_WORKOUT_WEBHOOK_SECRET`: usado para validar requests entrantes.

## Recomendacion

Para el primer corte, hacer que n8n escriba en `training_ingestions` y que la normalizacion al modelo canonico quede en una capa de aplicacion controlada.
