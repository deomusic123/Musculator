# Politica de variables y secretos

## Objetivo

Evitar que una variable termine en un scope mas amplio del necesario.

## Principios

- Todo secreto tiene un unico owner tecnico.
- Si una variable puede vivir fuera del cliente, no se expone al cliente.
- `NEXT_PUBLIC_*` se reserva solo para valores deliberadamente publicos.
- Las variables del runtime web no son automaticamente validas para n8n o Supabase Edge Functions.

## Matriz de ownership

| Variable | Scope correcto | Comentario |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor web | publica por naturaleza |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente y servidor web | segura solo con RLS bien configurado |
| `N8N_WORKOUT_WEBHOOK_URL` | servidor web | el navegador no deberia conocer el endpoint interno final |
| `N8N_WORKOUT_WEBHOOK_SECRET` | servidor web y n8n | usada para firmar o validar llamadas |
| `SUPABASE_SERVICE_ROLE_KEY` | edge functions, backend seguro o n8n | nunca en cliente ni en bundle web |
| `OPENAI_API_KEY` | edge functions o n8n | no debe vivir en browser |
| `VISION_API_KEY` | edge functions o n8n | mismo criterio |
| `SENTRY_AUTH_TOKEN` | CI/CD | no lo necesita la app en runtime |

## Convencion local

- `apps/web/.env.example`: contrato de variables del cliente web.
- `apps/web/.env.local`: variables locales del cliente web y su runtime server.
- Supabase: secretos cargados con la CLI o panel del proyecto.
- n8n: credenciales almacenadas en el credential store de n8n.

## Validacion

- Validar variables en tiempo de arranque con Zod.
- Exportar getters separados para cliente y servidor.
- Fallar rapido cuando falta una variable critica del runtime adecuado.
