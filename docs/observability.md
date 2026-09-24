# Observabilidad

Errores, rendimiento, logs y product analytics de Zentlet. **Todo es opcional**: sin variables de entorno la app funciona exactamente igual, no descarga ningún SDK y sólo escribe logs.

## Qué se usa y por qué

| Pieza | Para qué | Se activa con |
|---|---|---|
| **Pino** | Logs JSON estructurados del servidor (en desarrollo, una línea legible) | Siempre (`LOG_LEVEL` opcional) |
| **Sentry** | Errores de servidor y navegador, trazas y rendimiento. Internamente usa OpenTelemetry: HTTP, queries de `pg` y spans del AI SDK sin instrumentar a mano | `SENTRY_DSN` (servidor) · `NEXT_PUBLIC_SENTRY_DSN` (navegador) |
| **PostHog** | Product analytics: eventos, funnels, retención | `NEXT_PUBLIC_POSTHOG_KEY` |

Descartado por ahora, y cuándo reconsiderarlo:

- **SDK de OpenTelemetry propio / Collector**: Sentry ya consume OTel y el AI SDK ya emite spans OTel. Si hace falta enviar trazas a otro backend, se añade `@vercel/otel` con un exportador OTLP; los spans existentes sirven tal cual.
- **Prometheus + Grafana**: Prometheus consulta (*pull*) procesos de larga vida; en serverless no encaja. Tiene sentido con contenedores propios, varios servicios y SLOs formales.
- **Jaeger**: la vista de trazas de Sentry cubre el caso. Sería útil con microservicios y tracing self-hosted.
- **Session Replay (Sentry) / grabaciones y autocapture (PostHog)**: descartados por privacidad; la pantalla muestra importes y descripciones.

## Estructura

```
src/instrumentation.ts          Sentry en servidor (sólo con DSN) + onRequestError
src/instrumentation-client.ts   carga diferida de Sentry/PostHog en el navegador
src/app/global-error.tsx        reporta errores de render no capturados
src/lib/observability/
  events.ts                     taxonomía tipada de eventos
  server.ts                     reportError · reportRequestError · trackServerEvent
  client.ts                     track · identifyUser · resetUser · reportClientError
  logger.ts                     Pino con redact
  sentry.ts                     opciones comunes de Sentry (qué datos NO recoge)
  scrub.ts                      saneado de `?q=` y de errores de Prisma
  analytics-identity.tsx        identifica la sesión en /admin
```

Reglas:

- El código de negocio importa sólo `@/lib/observability/*`, nunca `@sentry/*` ni `posthog-*`. Cambiar de proveedor toca `server.ts`, `client.ts` y `sentry.ts`.
- Ninguna función de observabilidad lanza excepciones ni se espera: el envío a PostHog desde el servidor va en `after()` con timeout de 2 s.
- `withSentryConfig` sólo envuelve `next.config.ts` cuando hay DSN en el build.

## Qué se instrumenta

- **Route Handlers**: cada 500 pasa por `internalError()` ([route-helpers.ts](../src/lib/api/route-helpers.ts)): log `error` + Sentry. Antes se descartaba el error.
- **Errores no manejados** (render, Server Actions, handlers): `onRequestError` en `instrumentation.ts`.
- **IA**: `generateObject` ([ai/client.ts](../src/lib/ai/client.ts)) registra `ai.generate` (operación, modelo, `durationMs`, tokens) o `ai.generate_failed`. Nunca el prompt.
- **Base de datos**: queries de más de 500 ms → log `db.slow_query` con el SQL parametrizado (sin valores). Con Sentry, además, cada query es un span.
- **Navegador**: errores globales y crashes de render (Sentry), navegación y Web Vitals.
- **Sincronización offline**: cuando el servidor rechaza una escritura de la cola (el cambio local se revierte), `reportSyncFailure()` ([sync-policy.ts](../src/core/offline/sync-policy.ts)) envía un `SyncRejectedError` con tags `operation` y `status`, agrupado por ambos. Los errores de red no llegan (se reintentan siempre) y el 409 de "categoría en uso" no se reporta: es una regla de negocio. No se envía el error de Axios, que lleva en `config.data` el contenido del movimiento.

## Límite de uso de la IA

Cada usuario tiene 30 llamadas al modelo por minuto, compartidas entre las dos Server Actions de IA ([quota.ts](../src/lib/ai/quota.ts)). Al superarlo, la acción devuelve `null` sin llamar al modelo (sin sugerencia; en categorías, iconos de reserva) y se registra **un** `ai.rate_limited` por ventana.

El contador vive en memoria de cada instancia ([rate-limit.ts](../src/lib/rate-limit.ts)): frena el abuso, pero con N instancias el tope real es N × 30. Si se necesita un tope global exacto, se cambia el almacenamiento a Postgres o Redis sin tocar las acciones.

## Eventos de producto

Formato `objeto_acción` en pasado. Propiedades: sólo enums y booleanos.

| Evento | Origen | Propiedades |
|---|---|---|
| `user_signed_up` | servidor (hook de better-auth) | `method`: email · google · github |
| `login_completed` | servidor (hook de sesión; no en el alta con email) | `method` |
| `transaction_created` | cliente, al guardar (también sin conexión) | `source`: form · voice · `type` · `category_auto` |
| `transaction_deleted` | cliente | — |
| `category_created` | cliente | `ai_suggested` |
| `category_updated` | cliente | — |
| `voice_entry_started` | cliente | — |
| `voice_entry_completed` | cliente | `outcome`: saved · edited |
| `voice_entry_failed` | cliente | `reason` (`SpeechError`) |
| `$pageview` | automático | ruta |

`category_auto = true` significa que el usuario guardó con la categoría que propuso la app (texto o IA): es la tasa de aceptación de las sugerencias.

**Añadir un evento**: declararlo en `AnalyticsEvents` ([events.ts](../src/lib/observability/events.ts)) y llamar a `track()` donde ocurre la acción del usuario. TypeScript valida nombre y propiedades.

### Métricas que salen de aquí

- **Negocio (PostHog)**: usuarios activos, movimientos por usuario, adopción de voz (`source=voice`), aceptación de la IA (`category_auto`), funnel registro → primera categoría → primer movimiento, retención.
- **Técnicas (Sentry y logs)**: tasa de 5xx y p95 por ruta, Web Vitals, queries lentas, latencia/fallos/tokens de IA.

## Privacidad

Zentlet maneja finanzas personales. Lo que llega a cada proveedor:

| Proveedor | Recibe | Nunca recibe |
|---|---|---|
| Sentry | stack traces, método y ruta, id interno del usuario, spans con SQL parametrizado | cuerpos HTTP, cookies, cabeceras, valores de queries, prompts/respuestas de IA, variables locales, texto de búsqueda (`?q=`) |
| PostHog | eventos de la tabla, páginas vistas, id interno del usuario | importes, descripciones, nombres de categoría, email, nombre, clics o grabaciones |
| Logs | mensaje, contexto técnico, id interno | `password`, `email`, `name`, `description`, `amount`, `reference`, tokens, cookies (redact de Pino) |

- Los errores de Prisma copian los argumentos de la query en el mensaje; `withoutQueryData()` los elimina antes de loguear o reportar.
- Recomendado en el panel de PostHog: *Discard client IP data*.
- Sentry v11 recoge por defecto cuerpos, cookies y entradas de IA: [sentry.ts](../src/lib/observability/sentry.ts) lo apaga explícitamente. Revisarlo al actualizar de major.

## Variables de entorno

| Variable | Dónde | Notas |
|---|---|---|
| `LOG_LEVEL` | servidor | `debug` en desarrollo, `info` en producción por defecto |
| `SENTRY_DSN` | servidor | activa Sentry en servidor |
| `NEXT_PUBLIC_SENTRY_DSN` | navegador | activa Sentry en navegador; el DSN es público por diseño |
| `SENTRY_AUTH_TOKEN` | build | **secreto**; sube source maps. Nunca con prefijo `NEXT_PUBLIC_` |
| `SENTRY_ORG` / `SENTRY_PROJECT` | build | para la subida de source maps |
| `NEXT_PUBLIC_POSTHOG_KEY` | ambos | clave de proyecto, pública por diseño |
| `NEXT_PUBLIC_POSTHOG_HOST` | ambos | `https://us.i.posthog.com` por defecto (`https://eu.i.posthog.com` en la UE) |

El muestreo de trazas es del 20 % en producción y del 100 % en desarrollo (`sentry.ts`).
