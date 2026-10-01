# Arquitectura del servidor: puertos y adaptadores

**Regla:** la lógica del servidor debe poder moverse a un backend dedicado (p. ej. NestJS) sin reescribir los servicios, y cambiar una librería o un proveedor no debe tocar el código que lo usa. Los servicios opcionales se activan con variables de entorno, y si fallan la app sigue funcionando.

## El patrón

Cada servicio de infraestructura sigue la misma forma:

```
src/lib/<servicio>/
  types.ts          puerto: la interfaz que conoce el resto del código
  adapters/<x>.ts   adaptador: el ÚNICO archivo que importa la librería o el SDK
  index.ts          composición: elige el adaptador (env) y expone la fachada
```

- **Puerto (interfaz)**: describe *qué* hace el servicio, sin nombrar al proveedor.
- **Adaptador**: implementa el puerto con una librería concreta. Lanza si falla; la fachada decide qué hacer.
- **Composición / fábrica**: lee las variables de entorno y elige el adaptador. Sin configuración devuelve `null` (Null Object) y la fachada degrada con elegancia.
- **Fachada**: funciones estables (`sendEmail`, `generateObject`, `reportError`…) que importa el negocio.

En NestJS cada puerto es un *provider token* (`EMAIL_SENDER`, `KEY_VALUE_STORE`…), cada adaptador una clase `@Injectable()`, y `index.ts` pasa a ser el `useFactory` del módulo. Los servicios de negocio no cambian.

## Servicios

| Servicio | Puerto | Adaptadores | Se elige con | Sin configurar |
|---|---|---|---|---|
| Clave-valor (caché, límites) | `KeyValueStore` · [kv/](../src/lib/kv/) | Redis (`ioredis`) | `REDIS_URL` | Todo va a Postgres |
| Correo | `EmailSender` · [email/](../src/lib/email/) | Resend | `EMAIL_PROVIDER` + credenciales | Dev: terminal · Prod: error reportado |
| IA | `ObjectGenerator` · [ai/](../src/lib/ai/) | Google (AI SDK) | `AI_PROVIDER` + clave | IA desactivada |
| Logs | `Logger` · [observability/logger/](../src/lib/observability/logger/) | Pino | — | — |
| Errores | `ErrorReporter` · [observability/](../src/lib/observability/) | Sentry | `SENTRY_DSN` | Sólo logs |
| Analytics | `AnalyticsTracker` · [observability/](../src/lib/observability/) | PostHog (HTTP) | `NEXT_PUBLIC_POSTHOG_KEY` | Sólo logs |
| Tareas tras la respuesta | `BackgroundRunner` · [background/](../src/lib/background/) | Next (`after`) | — | — |
| Pagos | `BillingProvider` · [billing/providers/](../src/features/billing/providers/) | Mercado Pago | `BILLING_PROVIDER` | — |
| Canales de notificación | `ChannelStrategy` · [notification/server/channels/](../src/features/notification/server/channels/) | Correo | flags por canal | — |

**Añadir un proveedor** (p. ej. otro de correo): escribir `adapters/<nombre>.ts` con el puerto, registrarlo en `PROVIDERS` de `index.ts` y documentar sus variables en `.env.example`. Nada más cambia.

**Añadir un canal de notificación** (p. ej. push): implementar `ChannelStrategy`, registrarlo en `channels/index.ts` y añadir su flag.

Los nombres de variables, checks y logs usan la tecnología (`REDIS_URL`, "Redis", `kv.unavailable`), nunca el proveedor que la aloja.

## Redis

Opcional. Con `REDIS_URL` se usa para:

| Uso | Clave | TTL | Invalidación |
|---|---|---|---|
| Límites de uso (escrituras, IA, export, feedback) | `rate:<clave>` | la ventana | — |
| Límites de Better Auth (login, registro…) | `rate:auth:<ip+ruta>` | la ventana | — |
| Plan efectivo del usuario | `billing:plan:<userId>` | 60 s | al escribir una suscripción |
| Definiciones de feature flags | `flags:definitions` | 30 s | al cambiar un flag |
| Overrides de flags por usuario | `flags:user:<userId>` | 30 s | al asignar o quitar un override |
| Marca de "flag usado" | `flags:used:<slug>` | 1 h | al cambiar el flag |

**Si Redis falla:** cada operación tiene un timeout de 500 ms; tras un fallo se deja de usar durante 30 s (cortocircuito) y todo sigue con Postgres. Los límites siguen funcionando contra la base de datos y la caché pasa a leer directo de ella. El TTL acota cuánto dura un valor viejo si una invalidación no llegó durante la caída.

**Las sesiones no van a Redis.** `cookieCache` ya evita la base de datos durante 5 min, y con `secondaryStorage` una caída durante un cierre de sesión dejaría una sesión revocada viva al volver Redis. El rate limit de Better Auth usa `customStorage`, que no toca las sesiones.

Local: `docker compose up` levanta Redis; `docker compose stop redis` simula la caída.

## Capa HTTP (pegamento con Next)

Sólo estos archivos conocen Next; en un backend dedicado se reemplazan por su equivalente:

| Archivo | Qué hace | En NestJS |
|---|---|---|
| `src/app/api/**/route.ts` | Route Handlers | Controllers |
| `src/features/*/ai/actions/*.ts` | Server Actions (sesión + transporte) | Controllers |
| [api/route-helpers.ts](../src/lib/api/route-helpers.ts) | sesión, errores HTTP, validación | Guards, pipes, filtros |
| [api/action-session.ts](../src/lib/api/action-session.ts) | sesión en Server Actions | Guard de auth |
| [billing/http/guard.ts](../src/features/billing/http/guard.ts) | 403 si el plan no incluye la función | Guard |
| [background/next.ts](../src/lib/background/next.ts) | `after` | `setImmediate` o una cola |
| [observability/next.ts](../src/lib/observability/next.ts) | `onRequestError` | Filtro de excepciones global |
| `src/proxy.ts`, `src/instrumentation.ts` | middleware y arranque | Middleware y `main.ts` |

Los servicios (`src/features/*/server`, `src/features/*/ai/services`, `src/lib/*`) no importan `next/*`.

## Pendiente

- **Route Handlers con Prisma directo**: unas 20 rutas consultan la base de datos en el propio handler. Para migrar sin reescribir, esa lógica debería pasar a servicios por feature (`features/<x>/server`), dejando el handler en sesión → validación → servicio → respuesta.
- **Turnstile**: si Cloudflare no responde, el registro y el login con correo devuelven 500 (Google y GitHub siguen funcionando). Bloquear ante la duda es la opción conservadora; se puede cambiar a dejar pasar con el rate limit activo.
