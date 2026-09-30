# Pagos y suscripciones

Implementación v1: **Mercado Pago (suscripciones sin plan asociado), 1 plan de pago (Pro), PEN, prueba de 15 días**.
Planes, features y control de acceso: [features.md](features.md) · Auditoría y pendientes: [billing-review.md](billing-review.md).

## 1. Estructura

```
src/features/billing/
  types/        estados, eventos, BillingSummary
  lib/          plans · entitlements · lifecycle · proration · plan-hint      (puro, con tests)
  providers/    types.ts (puerto) · index.ts (registro) · mercadopago/         (adaptador)
  server/       checkout · cancel · subscriptions · payments · webhooks · reconcile · guard · events
  schemas/      billing-api.schema.ts (zod)
  services/     billing.service.ts (axios)
  stores/       billing.store.ts (TanStack Query)
  hooks/        useBillingActions · useBillingReturn
  ui/           plan-row · upgrade-button · billing-return
src/app/api/billing/…   Route Handlers (finos: sesión → validación → server/)
src/app/api/cron/billing-sync/route.ts
```

| Regla | Cómo se cumple |
|---|---|
| Nada fuera de `providers/mercadopago/` conoce Mercado Pago | El resto usa `BillingProvider` y tipos propios |
| La UI no toca la base de datos ni la pasarela | UI → `billingService` (HTTP) → `/api/billing/*` |
| `lib/` es puro | Sin Prisma, sin red: se testea sin mocks |
| El precio lo decide el servidor | El cliente sólo envía `planKey` (zod: `z.enum(PAID_PLAN_KEYS)`) |

## 2. Patrón

**Ports & Adapters con Strategy**: `BillingProvider` es el puerto; `createMercadoPagoProvider()` el adaptador; `getBillingProvider(name)` elige la estrategia desde un mapa (`BILLING_PROVIDER` o el `provider` guardado en cada suscripción). Sin factory, DI ni repositorios: Prisma directo como el resto del proyecto.

| Operación del puerto | Mercado Pago |
|---|---|
| `createCheckout` | `POST /preapproval` (`status: pending`, `external_reference = subscription.id`, `X-Idempotency-Key`) |
| `getSubscription` | `GET /preapproval/{id}` |
| `getPayment` | `GET /authorized_payments/{id}` |
| `cancelSubscription` | `PUT /preapproval/{id}` `{ status: "cancelled" }` |
| `refundPayment` | `POST /v1/payments/{id}/refunds` (`X-Idempotency-Key`) |
| `parseWebhook` | Valida `x-signature` (HMAC-SHA256) y normaliza la notificación |

**Añadir Culqi/Stripe**: crear `providers/<nombre>/`, implementar las 6 operaciones, registrarlo en `providers/index.ts`, añadir `"<nombre>"` a `ProviderName`. Las suscripciones existentes siguen en su proveedor (columna `provider`); no hay migración.

## 3. Modelo de datos

Migración: `prisma/migrations/20260929120000_billing_subscriptions` (fusiona la anterior de índices/checks).

### `subscription`

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid | Se envía a la pasarela como `external_reference` |
| `userId` | FK `user` (cascade) | Dueño: el usuario (no hay teams) |
| `planKey` | text | Clave del catálogo en código (`pro`) |
| `status` | text + CHECK | `pending · trialing · active · past_due · canceled` |
| `amount` / `currency` / `interval` | int (céntimos) / text / text | Foto del precio al suscribirse |
| `provider` / `externalId` | text / text? | `UNIQUE(provider, externalId)` |
| `checkoutUrl` | text? | Se reutiliza 24 h (doble clic) |
| `trialEndsAt` | timestamp? | Fin de la prueba; `null` si no hubo |
| `currentPeriodEnd` | timestamp? | Hasta cuándo hay acceso pagado |
| `canceledAt` | timestamp? | |

Índices: `(userId, status)`, `(status, updatedAt)` y **parcial único** `subscription_one_live_per_user` sobre `userId` cuando `status IN (pending, trialing, active, past_due)`.

### `billing_payment`

| Columna | Nota |
|---|---|
| `subscriptionId` | FK `subscription` (cascade) |
| `provider` / `externalId` | Cuota (authorized payment). `UNIQUE(provider, externalId)` |
| `providerPaymentId` | Pago real, necesario para reembolsar |
| `status` + CHECK | `pending · approved · failed · refunded · partially_refunded` |
| `amount` / `refundedAmount` | Céntimos. CHECK `0 ≤ refundedAmount ≤ amount` |
| `currency` / `paidAt` | |

### `billing_event` (auditoría + idempotencia)

| Columna | Nota |
|---|---|
| `source` | `webhook · user · system · admin` |
| `type` | `checkout.started`, `subscription.status_changed`, `subscription.canceled`, `payment.refunded`, `checkout.abandoned`, tópico del webhook… |
| `provider` / `externalId` | Id de la notificación. `UNIQUE(provider, externalId)` |
| `resourceId` / `userId` / `subscriptionId` | Sin FK: sobrevive al borrado de la cuenta |
| `data` | Metadata mínima (`from/to`, importe, modo). **Nunca el payload** |
| `processedAt` | `null` = recibido pero no procesado (se reintenta) |

## 4. Estados

| Interno | Acceso Pro | Origen |
|---|---|---|
| `pending` | No | Checkout creado, sin autorizar |
| `trialing` | Hasta `trialEndsAt` | Autorizada, sin cobros, dentro de la prueba |
| `active` | Sí | Autorizada y al día |
| `past_due` | `currentPeriodEnd` + 10 días (ventana de reintentos de MP) | Último cobro fallido o pausada |
| `canceled` | Hasta `currentPeriodEnd` | Cancelada por usuario, sistema o MP (3 cuotas rechazadas) |

| Mercado Pago | Snapshot | Regla de dominio (`resolveStatus`) |
|---|---|---|
| `pending` | `pending` | — |
| `authorized` | `active` | → `trialing` si no hay cobros y `now < trialEndsAt`; → `past_due` si el último cobro falló |
| `paused` | `past_due` | — |
| `cancelled` / `finished` | `canceled` | — |
| otro | error | No se adivina: se reintenta y se reporta |

| Cuota MP (`authorized_payment`) | `billing_payment.status` |
|---|---|
| `payment.status = approved` | `approved` |
| `payment.status = rejected` · cuota `recycling` / `cancelled` | `failed` |
| `scheduled`, `waiting for gateway`, `in_process` | `pending` |
| `refunded` / `charged_back` | `refunded` |

## 5. Flujos

**Checkout** — `POST /api/billing/checkout { planKey }`
```
¿suscripción viva?  active/trialing/past_due → 409 · pending con url < 24 h → misma url · pending vieja → abandonar
prueba = nunca tuvo una prueba iniciada ? 15 días : 0
primer cobro = max(hoy + prueba, fin del periodo pagado de una cancelada)   ← re-suscribirse no cobra doble
INSERT subscription(pending)        ← índice parcial: segundo clic simultáneo → 409
provider.createCheckout → guarda externalId + checkoutUrl   (si falla → abandona y 500)
→ { redirectUrl }  →  usuario autoriza en MP  →  vuelve a /admin?billing=return  →  POST /api/billing/sync
```

**Webhook** — `POST /api/billing/webhooks/mercadopago`
```
1. firma x-signature (HMAC, ts ±5 min, comparación en tiempo constante) → 401 si falla
2. INSERT billing_event(provider, notificationId) → ya procesado: 200 "duplicate"
3. re-consulta el recurso a MP (nunca se confía en el payload)
   subscription_preapproval       → applySnapshot
   subscription_authorized_payment → upsert billing_payment → applySnapshot
4. external_reference ≠ subscription.id → se ignora (log)
5. processedAt = now → 200.  Error → 500 → MP reintenta cada 15 min → se reprocesa
```

**Cancelación** — `POST /api/billing/cancel`
| Estado | Efecto |
|---|---|
| `pending` | Se abandona; **no consume la prueba** |
| `trialing` | Cancela en MP (no habrá cobro); acceso hasta `trialEndsAt` |
| `active` | Cancela en MP; acceso hasta `currentPeriodEnd`; sin reembolso automático |
| `past_due` | Cancela en MP; acceso termina (no hay periodo pagado vigente) |
| sin suscripción viva | 200, no hace nada (idempotente) |
| MP falla | 500 y **no** se marca como cancelada |

**Borrado de cuenta**: `deleteUser.beforeDelete` cancela en la pasarela; si falla, la cuenta no se borra.

**Reconciliación** — cron diario `GET /api/cron/billing-sync` (10:00 UTC, `CRON_SECRET`), lotes de 100:
- `pending` > 1 h → sync; > 7 días → cancelar en MP y abandonar.
- `trialing/active/past_due` con `currentPeriodEnd` vencido y todos los `past_due` → sync.
- MP manda: si discrepa, se escribe el snapshot de MP y queda `subscription.status_changed` en `billing_event`.

## 6. Prueba gratuita (15 días)

| Regla | Implementación |
|---|---|
| Pide medio de pago al empezar | Checkout de MP con `auto_recurring.start_date = hoy + 15 días` |
| Primer cobro al día 15 | MP cobra en `start_date`; el webhook de la cuota activa `active` |
| Cancelar en la prueba = 0 cobros | `cancel` → `PUT status: cancelled` antes de `start_date` |
| Una prueba por usuario | `isTrialEligible`: ninguna suscripción previa con `trialEndsAt` fuera de `pending` |
| Checkout abandonado no gasta la prueba | `abandonPending` pone `trialEndsAt = null` |
| Sin integración con plan asociado | MP sólo expone `free_trial` en `preapproval_plan`; `start_date` diferido logra lo mismo sin plan |

## 7. Reembolsos y prorrateo

`POST /api/billing/admin/refunds` — `Authorization: Bearer BILLING_ADMIN_SECRET` (soporte, no autoservicio).

| Campo | Valores |
|---|---|
| `paymentId` | id de `billing_payment` |
| `mode` | `full` (lo pendiente de reembolsar) · `prorated` (días sin usar del periodo) |
| `revokeAccess` | `true` → cancela en MP y corta el acceso ya |

| Garantía | Cómo |
|---|---|
| Nunca más de lo cobrado | `min(calculado, amount − refundedAmount)` + CHECK en BD |
| Doble envío | `X-Idempotency-Key = refund:{paymentId}:{refundedAmount previo}` → MP no duplica |
| Carrera entre dos admins | `updateMany where refundedAmount = previo` → el segundo recibe 409 |
| Redondeo | `Math.floor` a céntimo (a favor del comercio) |
| Plazo | MP Perú permite reembolsar hasta **90 días** tras la aprobación |

**Prorrateo** (`lib/proration.ts`): `unusedAmount = amount × (fin − ahora) / (fin − inicio)`. Hoy se usa en reembolsos. Con un solo plan no hay upgrades/downgrades; la estrategia para cuando existan está en [billing-review.md](billing-review.md#prorrateo-de-cambios-de-plan).

## 8. API

| Método y ruta | Auth | Idempotencia |
|---|---|---|
| `GET /api/billing/me` | sesión | lectura |
| `POST /api/billing/checkout` | sesión + `writeLimit` | índice parcial + reuso de `pending` + `X-Idempotency-Key` |
| `POST /api/billing/cancel` | sesión + `writeLimit` | sin viva → no-op |
| `POST /api/billing/sync` | sesión + `writeLimit` | escribe el snapshot de MP |
| `POST /api/billing/webhooks/[provider]` | firma HMAC | `UNIQUE(provider, externalId)` + `processedAt` |
| `POST /api/billing/admin/refunds` | `BILLING_ADMIN_SECRET` | clave de MP + update condicional |
| `GET /api/cron/billing-sync` | `CRON_SECRET` | snapshot |

## 9. Configuración

| Variable | Uso |
|---|---|
| `BILLING_PROVIDER` | `mercadopago` (defecto) |
| `MERCADOPAGO_ACCESS_TOKEN` | Credencial privada (TEST- en desarrollo) |
| `MERCADOPAGO_WEBHOOK_SECRET` | Clave secreta de Webhooks para `x-signature` |
| `MERCADOPAGO_TEST_PAYER_EMAIL` | Sólo sandbox: comprador de prueba que paga en lugar del usuario logueado. Ignorada con `VERCEL_ENV=production` |
| `BILLING_ADMIN_SECRET` | Endpoint de reembolsos |
| `CRON_SECRET` | Ya existía; también protege `billing-sync` |

En Mercado Pago → Tus integraciones → Webhooks: URL `https://<dominio>/api/billing/webhooks/mercadopago`, tópicos **Planes y suscripciones** (`subscription_preapproval`, `subscription_authorized_payment`). También se puede configurar con la tool `save_webhook` del MCP de Mercado Pago una vez desplegado.

## 10. Tests

| Archivo | Cubre |
|---|---|
| `lib/*.test.ts` | acceso por estado, plan efectivo, prueba, primer cobro, prorrateo, textos de UI |
| `providers/mercadopago/*.test.ts` | firma (válida, alterada, caducada, hora en segundos), body del checkout, mapeo de estados y céntimos, llamadas HTTP del adaptador (cabeceras, idempotencia, motivo del error, comprador de prueba) |
| `api/billing/checkout` | prueba, sin prueba, 409 activa, doble clic, carrera, fallo de pasarela, plan inválido |
| `api/billing/webhooks` | firma inválida, activación, trialing, duplicado, reintento, cobro fallido, referencia ajena, tópico ignorado |
| `api/billing/cancel` | prueba, activa, pending, idempotencia, fallo de pasarela |
| `api/billing/admin/refunds` | auth, total, prorrateado, revocar acceso, no reembolsable, carrera |
| `api/budget`, `api/account/export` | 403 con plan free |

### Integración (`pnpm test:integration`)

Route Handlers reales contra un **Postgres real**; sólo se simulan la pasarela (`src/test/integration/fake-provider.ts`, en memoria y con estado) y la sesión.

| Pieza | Qué hace |
|---|---|
| `vitest.integration.config.mts` | Sólo `*.integration.test.ts`, en serie. `pnpm test` los excluye y no necesita base de datos |
| `global-setup.ts` | Crea `<base>_test` si no existe y aplica las migraciones (`prisma migrate deploy`) |
| `setup.ts` | Apunta `DATABASE_URL` a la base de prueba antes de cargar Prisma |
| `database.ts` | `resetDatabase()` se niega a truncar una base cuyo nombre no termine en `_test` |
| `TEST_DATABASE_URL` | Opcional: otra base de prueba. Por defecto, la de `DATABASE_URL` + `_test` |

| Escenario (`billing.integration.test.ts`) | Comprueba |
|---|---|
| Checkout | Fila `pending` con prueba y precio del catálogo; doble clic simultáneo → una sola suscripción viva (índice parcial real) |
| Ciclo por webhooks | pending → trialing → active; cobro fallido → past_due → recuperación; acceso real a `/api/account/export` |
| Webhooks | Duplicado, fuera de orden, firma inválida, recurso ajeno |
| Sincronización | `POST /api/billing/sync` activa la prueba sin webhook; sin pagar; sin suscripción |
| Fallos | Pasarela caída en el checkout (no queda nada vivo, el reintento funciona); checkout de más de un día; rutas sin sesión → 401 |
| Cancelación | En prueba (acceso hasta el fin, sin segunda prueba, re-suscripción sin cobro doble), checkout sin pagar, doble cancelación |
| Reembolsos | Total, no repetible, con revocación de acceso, sin secreto |
| Cron | Abandono de checkouts viejos, corrección de estados que la pasarela cambió sin webhook |
| Integridad | Una viva por usuario, CHECK de estados e importes, reembolso ≤ cobro, cascada al borrar la cuenta conservando `billing_event` |
| Auditoría | Rastro completo `checkout.started → status_changed → webhook → canceled` |

### End-to-end (`pnpm test:e2e`)

Chromium (Playwright) contra un **build de producción** de la app, la base `<base>_e2e_test` y un **Mercado Pago simulado** (`e2e/mock-mercadopago.mjs`): su API de suscripciones, su página de pago y webhooks firmados como los reales. El adaptador real se usa completo; sólo cambia la URL (`MERCADOPAGO_API_URL`, ignorada en producción).

| Pieza | Qué hace |
|---|---|
| `playwright.config.ts` | Levanta el mock (puerto 4010) y la app (`next build` + `next start`, puerto 3100) con el entorno de `e2e/env.ts`; los cierra al terminar |
| `e2e/global-setup.ts` | Crea y migra la base de prueba |
| `e2e/auth.setup.ts` | Registra una cuenta y guarda la sesión para todos los tests |
| `e2e/fixtures.ts` | Antes de cada test vacía las tablas de billing y reinicia el mock; `gateway.charge()` / `gateway.setWebhooks()` provocan escenarios |

| Test | Comprueba en el navegador |
|---|---|
| Plan Free | Ajustes muestra "Free · Pro desde S/ 14.90 al mes", la oferta de prueba y exportar bloqueado; la API responde 403 a presupuestos y exportación |
| Suscripción | Ajustes → *Probar 15 días* → página de pago → vuelta a la app → "Prueba de Pro hasta…", *Cancelar* y exportar disponibles |
| Datos enviados a la pasarela | Precio del servidor (14.9 PEN mensual), correo del usuario y primer cobro a 15 días |
| Sin webhook | Con los webhooks apagados, la app se sincroniza sola al volver del pago |
| Pago abandonado | "Esperando la confirmación del pago" y reintentar lleva al mismo checkout (sin crear otro) |
| Cancelación | *Cancelar* → *Confirmar* → "Pro hasta el… No se renovará", sin segunda prueba, cancelada en la pasarela |
| Cobros | Cobro rechazado → aviso en Ajustes; cobro aprobado → "Pro · se renueva el…" |
| Volver a suscribirse | Tras cancelar en la prueba: sin segunda prueba y el primer cobro de la nueva suscripción coincide con el fin de la anterior (sin cobro doble) |
| Presupuestos | En Free la hoja de presupuesto ofrece Pro en lugar de *Guardar*; con Pro se guarda y queda en la cuenta |
| Borrar la cuenta | Con suscripción activa se cancela antes en la pasarela; si la pasarela falla, la cuenta **no** se borra y el usuario ve el error |
| Público | Sección de precios de la landing, enlace del menú, `/admin` redirige al login, rutas de billing sin sesión → 401, webhook con firma falsa → 401 |

Cobertura de líneas del backend de billing (medida con v8, 2026-09-30): integración 67 % · unitarios 84 % · **ambos 96 %**. Sin cubrir: ramas de error 500 de las rutas y el código de cliente (hooks, store, servicio).
