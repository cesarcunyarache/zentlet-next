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
| `providers/mercadopago/*.test.ts` | firma (válida, alterada, caducada), body del checkout, mapeo de estados y céntimos |
| `api/billing/checkout` | prueba, sin prueba, 409 activa, doble clic, carrera, fallo de pasarela, plan inválido |
| `api/billing/webhooks` | firma inválida, activación, trialing, duplicado, reintento, cobro fallido, referencia ajena, tópico ignorado |
| `api/billing/cancel` | prueba, activa, pending, idempotencia, fallo de pasarela |
| `api/billing/admin/refunds` | auth, total, prorrateado, revocar acceso, no reembolsable, carrera |
| `api/budget`, `api/account/export` | 403 con plan free |
