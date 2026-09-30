# Pagos y suscripciones

Propuesta para la v1: **1 proveedor (Mercado Pago), 1 plan de pago, PEN**. Base preparada para más planes y proveedores sin migrar datos.

## 1. Punto de partida

| Qué hay | Implicación |
|---|---|
| Solo `User` (sin teams/orgs) | La suscripción pertenece al **usuario** |
| Route Handlers + Prisma directo (`src/app/api/*`) | Billing sigue el mismo patrón; sin repositorios |
| Servicios axios (`APIService`) con `NEXT_PUBLIC_API_URL` | El frontend ya habla HTTP: separar el backend es cambiar la URL |
| Server Actions solo para IA | Billing **no** usa Server Actions |
| Helpers `writeLimit`, `parseBody`, `internalError` | El guard de features copia ese estilo |
| Idempotencia por `id` generado en cliente | Se reutiliza la idea para checkout |
| Cron diario (`/api/cron/cleanup`, `CRON_SECRET`) | La reconciliación va en un cron igual |
| Nada de planes/pagos/permisos | Se parte de cero, sin reemplazar nada |

## 2. Decisiones

1. **Catálogo de planes y features en código**, no en tablas. Con 1 plan, una tabla `plans` + `features` + `plan_features` es infraestructura sin uso (sin admin, cambios versionados en git, tipado). La BD guarda solo `planKey` (string), así que pasar a tablas más adelante no migra suscripciones.
2. **Sin fila de suscripción = FREE.** No se crean filas para usuarios gratuitos.
3. **Una sola interfaz `BillingProvider`** (Strategy + Adapter en uno) y un mapa `nombre → implementación`. Sin factory, registry, ni ports por capa.
4. **El webhook no confía en el payload**: solo usa el id del recurso y vuelve a consultar al proveedor. Eso resuelve autenticidad, orden y duplicados de una vez.
5. **Entitlements = función pura** `can(plan, feature)` + un guard en los Route Handlers. El frontend solo lo usa para UX.

## 3. Estructura

```
src/features/billing/
  lib/            plans.ts · entitlements.ts · status.ts   (puro, con tests)
  providers/      types.ts · mercadopago.ts · index.ts     (solo servidor)
  server/         subscription.ts · guard.ts              (Prisma + provider)
  services/       billing.service.ts                     (axios, cliente)
  hooks/          useBilling.ts
  ui/             pricing/ · paywall/
  schemas/ types/

src/app/api/billing/
  me/route.ts                    GET   plan, estado, features
  checkout/route.ts              POST  { planKey } → { redirectUrl }
  cancel/route.ts                POST
  sync/route.ts                  POST  refresca desde el proveedor (al volver del checkout)
  webhooks/[provider]/route.ts   POST
src/app/api/cron/billing-sync/route.ts
```

Regla: fuera de `providers/` nadie importa el SDK ni la API de Mercado Pago.

## 4. Catálogo (código)

```ts
// lib/plans.ts
export const FEATURES = ["transactions", "dashboard", "budgets", "export", "ai"] as const;

export const PLANS = {
  free: { features: ["transactions", "dashboard"] },
  pro:  { features: [...all], price: { amount: 1490, currency: "PEN", interval: "month" } },
} as const;
```

- Precio en **céntimos (entero)**, moneda ISO, intervalo `month | year`.
- El precio lo decide el servidor; el cliente solo envía `planKey`.
- IDs externos por proveedor (si el proveedor los necesita) van en env o en `providers/<x>.ts`, nunca en el plan.

## 5. Modelo de datos

```prisma
model Subscription {
  id                     String    @id @default(uuid())
  userId                 String
  planKey                String
  status                 String    // pending | active | past_due | canceled
  provider               String    // "mercadopago"
  externalId             String?   // id de la suscripción en el proveedor
  checkoutUrl            String?
  currentPeriodEnd       DateTime?
  canceledAt             DateTime?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([provider, externalId])
  @@index([userId])
  @@map("subscription")
}

model BillingEvent {
  id          String   @id @default(uuid())
  provider    String
  externalId  String   // id de la notificación
  type        String
  resourceId  String
  processedAt DateTime?
  createdAt   DateTime @default(now())

  @@unique([provider, externalId])
  @@map("billing_event")
}
```

- **Índice parcial en SQL** (Prisma no lo expresa): una sola suscripción viva por usuario.
  `CREATE UNIQUE INDEX ON subscription ("userId") WHERE status IN ('pending','active','past_due');`
- `BillingEvent` guarda **solo metadata**, sin payload: el estado real se consulta al proveedor.
- `onDelete: Restrict` a propósito: borrar la cuenta debe cancelar antes en el proveedor (ver riesgos).
- No hay `customer_id`: Mercado Pago no lo necesita para preapproval. Se añade como columna nullable si otro proveedor lo exige.

## 6. Provider

```ts
// providers/types.ts
interface BillingProvider {
  createCheckout(input: { subscriptionId: string; plan: Plan; email: string; returnUrl: string }):
    Promise<{ externalId: string; checkoutUrl: string }>;
  getSubscription(externalId: string): Promise<ProviderSnapshot>;
  cancel(externalId: string): Promise<void>;
  parseWebhook(req: Request, rawBody: string): Promise<WebhookRef | null>; // null = firma inválida
}

type ProviderSnapshot = { status: SubscriptionStatus; currentPeriodEnd: Date | null };
type WebhookRef = { eventId: string; type: string; resourceId: string };
```

- El mapeo de estados vive dentro de cada provider: el dominio solo ve `SubscriptionStatus`.
- `providers/index.ts`: `getProvider(name = process.env.BILLING_PROVIDER)`.
- Cada suscripción guarda su `provider`: las operaciones sobre una suscripción existente usan **ese**, no el de env. Con eso ya conviven dos proveedores (los antiguos siguen en MP aunque los nuevos vayan a Culqi) sin routing.

**Mercado Pago**: API de *preapproval* con redirección (`init_point`). El usuario paga en MP; nunca vemos tarjetas. `external_reference = subscription.id`.

## 7. Estados

| Interno | Significado | Acceso a PRO |
|---|---|---|
| `pending` | Checkout creado, sin pago | No |
| `active` | Cobrando al día | Sí |
| `past_due` | Cobro fallido o pausado | Sí (gracia hasta `currentPeriodEnd`) |
| `canceled` | Cancelada | Sí hasta `currentPeriodEnd`, luego no |

`expired` no es un estado: se deriva de `canceled/past_due + currentPeriodEnd < now`.

| Mercado Pago (preapproval) | Interno |
|---|---|
| `pending` | `pending` |
| `authorized` | `active` |
| `paused` | `past_due` |
| `cancelled` | `canceled` |
| pago autorizado `rejected` | `past_due` |

## 8. Flujos

**Suscripción**
```
Pricing → POST /api/billing/checkout {planKey}
  ├─ ¿existe viva? pending → devuelve su checkoutUrl · active → 409
  ├─ crea Subscription(pending)             ← índice parcial frena el doble clic
  ├─ provider.createCheckout → guarda externalId + checkoutUrl
  └─ { redirectUrl }
Usuario paga en MP → vuelve a /billing/return → POST /api/billing/sync → UI actualizada
En paralelo llega el webhook (fuente de verdad).
```

**Webhook**
```
POST /api/billing/webhooks/mercadopago
  1. provider.parseWebhook → valida x-signature (HMAC con MERCADOPAGO_WEBHOOK_SECRET) → 401 si falla
  2. INSERT BillingEvent (unique provider+externalId) → duplicado: 200 y fin
  3. provider.getSubscription(resourceId) → snapshot actual
  4. UPDATE Subscription por (provider, externalId); si no existe → log + 200
  5. processedAt = now → 200
  Error en 3-4 → 500 (MP reintenta; el evento sin processedAt se reprocesa)
```
Como siempre se lee el estado actual del proveedor, un evento viejo que llega tarde escribe el estado nuevo: el orden deja de importar.

**Cancelación**: `POST /api/billing/cancel` → `provider.cancel` → `status=canceled`, `canceledAt`. Mantiene acceso hasta `currentPeriodEnd`. Repetirla no hace nada.

## 9. Entitlements

```ts
// lib/entitlements.ts (puro)
effectivePlan(sub, now): PlanKey        // free si no hay sub o no da acceso
can(planKey, feature): boolean

// server/guard.ts — mismo estilo que writeLimit
const denied = await requireFeature(userId, "export");
if (denied) return denied;              // 403 { message, feature }
```

| Capa | Rol |
|---|---|
| Authentication | Better Auth → `userId` |
| Billing / Subscription | ¿pagó? ¿en qué estado está? |
| Entitlement | `can(plan, feature)` |
| Authorization | `userId` dueño del recurso (ya existe en cada query) |

- La **barrera real** es `requireFeature` en el Route Handler (y en las Server Actions de IA si se restringe `ai`).
- El frontend usa `GET /api/billing/me` → `{ plan, status, features, currentPeriodEnd }` para ocultar/mostrar paywall.

## 10. Seguridad

- `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` solo en servidor; nada `NEXT_PUBLIC_`.
- El cliente envía solo `planKey`, validado con zod contra el catálogo. Precio, estado y features los decide el servidor.
- Webhook: firma HMAC + comparación en tiempo constante + tolerancia de `ts` + re-consulta al proveedor + comprobar que `external_reference` coincide con nuestra suscripción.
- Sin PAN/CVV: el pago ocurre en la página de MP.
- `writeLimit` en checkout/cancel/sync. El webhook no requiere sesión, solo firma.
- Logs sin payload ni email (seguir `scrub.ts`).

## 11. Idempotencia

| Operación | Mecanismo |
|---|---|
| Checkout (doble clic) | Índice parcial único + reusar la `pending` existente |
| Webhook duplicado | `UNIQUE(provider, externalId)` en `BillingEvent` |
| Webhook fuera de orden | Re-consulta del estado actual |
| Cancel | Idempotente por naturaleza (si ya está `canceled`, 200) |
| Sync / cron | Escribe el snapshot del proveedor; repetir no cambia nada |

Sin tabla de idempotency keys genérica.

## 12. Reconciliación

- **Bajo demanda**: `POST /api/billing/sync` al volver del checkout.
- **Cron diario** `/api/cron/billing-sync` (mismo patrón que `cleanup`): refresca suscripciones `pending` > 1 h, `past_due`, y `active/canceled` con `currentPeriodEnd` vencido. Marca `pending` abandonadas > 7 días como `canceled`.
- Si MP y la BD discrepan, **gana MP**, y se registra `billing.reconciled` en logs.

## 13. Separación futura del backend

Ya está casi resuelta por el patrón actual:
- La UI solo usa `billingService` (axios) → endpoints `/api/billing/*`.
- Toda la lógica está en `features/billing/{lib,server,providers}`, sin React.
- Mover el backend = copiar `server/`, `providers/`, `lib/` y las rutas; cambiar `NEXT_PUBLIC_API_URL` y la URL del webhook en MP.
- Única atención: la sesión (Better Auth por cookie) tendrá que viajar cross-origin; es un tema de auth, no de billing.

## 14. Fases

| Fase | Entregable | Hecho cuando |
|---|---|---|
| 1 | `lib/plans`, `lib/entitlements`, `lib/status` + tests | `can()` y `effectivePlan()` cubiertos |
| 2 | Migración `Subscription`, `BillingEvent`, índice parcial | `prisma migrate` aplicado |
| 3 | `providers/types` + `mercadopago` (checkout, get, cancel, parseWebhook) | Tests con fetch mockeado + prueba manual en sandbox |
| 4 | Rutas `checkout`, `me`, `cancel`, `sync` | Tests de ruta como los existentes |
| 5 | Webhook + cron `billing-sync` | Duplicado/firma inválida/fuera de orden testeados |
| 6 | `requireFeature` en las rutas PRO | 403 sin plan, 200 con plan |
| 7 | UI: pricing, paywall, página de retorno, estado en ajustes | Flujo completo en sandbox |
| 8 | Eventos PostHog (`checkout_started`, `subscription_activated`) + alertas Sentry en webhook | Visible en dashboards |

## 15. Qué NO implementar

- Tablas `plans` / `features` / `plan_features` (hasta necesitar editar planes sin deploy).
- Routing por país o método de pago entre proveedores.
- Tabla `provider_plans` / IDs externos por plan en BD.
- Historial de precios, cupones, trials, prorrateo, upgrades/downgrades.
- Multi-moneda.
- Facturas/comprobantes propios (SUNAT) — tema aparte.
- Repository pattern, DI container, event sourcing, CQRS, colas/broker, microservicio.
- Guardar payloads completos de webhooks.
- Permisos por rol (no hay teams).

## 16. Referencias (Dub / Cal.com)

| Idea | Lo hacen | Nosotros |
|---|---|---|
| Plan y límites definidos en código | Dub | **Sí** |
| Un handler por tipo de evento de webhook | Dub | No: con MP basta re-consultar el recurso |
| Plan/ids de Stripe como columnas del workspace | Dub | No: acoplado al proveedor |
| Billing por team/org | Cal.com, Dub (workspace) | No: sin teams |
| Tablas de feature flags (`Feature`, `TeamFeatures`) | Cal.com | No por ahora: el catálogo en código cubre el caso |
| Paquete de billing separado en monorepo | Cal.com | No: una carpeta `features/billing` basta |

## 17. Riesgos pendientes

- **Borrado de cuenta**: el flujo actual borra en cascada; con suscripción activa hay que cancelar en MP primero (por eso `Restrict`). Revisar `/api/account`.
- **Email del pagador en MP**: preapproval puede exigir que coincida con la cuenta MP del usuario; validar en sandbox.
- **Webhooks de MP** llegan por varios *topics* (`subscription_preapproval`, `subscription_authorized_payment`); confirmar cuáles resolver a qué recurso.
- **Periodo de gracia en `past_due`**: decidir si dar acceso hasta `currentPeriodEnd` o cortar al instante.
- **Datos creados con PRO** (p. ej. presupuestos) al volver a FREE: ¿solo lectura o se ocultan? Decisión de producto.
- **Comprobantes electrónicos** en Perú: fuera de alcance, pero necesario antes de escalar.
