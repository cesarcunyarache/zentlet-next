# Notificaciones — propuesta

Primer caso de uso: alertas de presupuesto. El diseño sirve para cualquier dominio (billing, seguridad, sistema).

## 1. Estado actual (presupuestos)

| Hecho | Consecuencia |
|---|---|
| El gasto de un presupuesto se calcula **solo en el cliente** (`useBudgetBars` + `/api/transaction/summary`) | El servidor no sabe cuándo se cruza un umbral: hay que calcularlo en el servidor |
| `budget/lib/period.ts` y `progress.ts` son funciones puras | Se reutilizan tal cual en el servidor (`periodContaining`, `limitAt`) |
| Las transacciones llegan por una cola offline, idempotentes por `id`, y se pueden editar o borrar | El mismo umbral se puede "cruzar" varias veces → hace falta deduplicar |
| Hosting en Vercel (serverless) | WebSocket propio no es viable; SSE limitado por la duración máxima de la función |
| `UserPreference` tiene `language`, `timezone`, `extras` | El texto se traduce y el "hoy" se calcula en la zona del usuario |
| Ya hay `sendEmail` (Resend), `CRON_SECRET` y service worker | Email y Web Push encajan sin librerías nuevas de infraestructura |

## 2. Flujo

```
POST/PATCH/DELETE /api/transaction, PUT /api/budget/:id/limits
  └─ after() → evaluateBudget(userId, categoryId, date)
       ├─ gasto ≥ umbral de una budget_alert  → notify({ type: "budget.alert", ... })
       └─ gasto > límite                      → notify({ type: "budget.exceeded", ... })
            notify(...)
                 ├─ INSERT notification            (canal in-app = la fila misma)
                 ├─ INSERT notification_delivery   (1 por canal externo habilitado)
                 └─ after() → dispatcher → Strategy por canal
cron /api/cron/notifications → reintenta deliveries pendientes o fallidas
```

- `after()` (Next) evita sumar latencia a la respuesta de la transacción.
- La evaluación cuenta solo gastos (`expense`) de la categoría dentro del periodo activo.
- No se "retira" una alerta si luego baja el gasto; la deduplicación impide que se repita.

## 3. Tablas

```prisma
model Notification {
  id        String    @id @default(uuid())
  userId    String
  type      String                 // "budget.alert", "billing.payment_failed", ...
  data      Json                   // ids y números, nunca texto renderizado ni PII
  entityType String?               // "budget"
  entityId   String?               // budgetId → navegación y borrado en cascada lógico
  dedupeKey String?                // "budget.alert:{alertId}:{periodFrom}"
  readAt    DateTime?
  archivedAt DateTime?
  createdAt DateTime  @default(now())

  user       User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveries NotificationDelivery[]

  @@unique([userId, dedupeKey])
  @@index([userId, readAt, createdAt(sort: Desc)])
  @@map("notification")
}

model NotificationDelivery {
  id             String    @id @default(uuid())
  notificationId String
  channel        String              // "email" | "sms" | "push"
  status         String    @default("pending") // pending | sent | failed | skipped
  attempts       Int       @default(0)
  providerId     String?             // id de Resend/Twilio para trazabilidad
  error          String?
  nextAttemptAt  DateTime  @default(now())
  sentAt         DateTime?
  createdAt      DateTime  @default(now())

  notification Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  @@unique([notificationId, channel])
  @@index([status, nextAttemptAt])
  @@map("notification_delivery")
}

model PushSubscription {           // solo cuando se implemente push
  id        String   @id @default(uuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscription")
}
```

**Justificación**

- **Una sola tabla `notification`** (tu idea) para el contenido y el canal in-app: sí. El canal "database" no es una estrategia más, es la fuente de verdad.
- **`notification_delivery` separada**: una notificación puede ir a email + push; cada canal falla, se reintenta y se audita por separado. Meter `emailStatus`, `smsStatus`… en la misma tabla obliga a migrar por cada canal nuevo.
- **`type` + `data` en vez de `title`/`body`**: el texto se renderiza al leer, en el idioma actual del usuario (next-intl), y sirve para cualquier dominio sin cambiar el esquema.
- **`dedupeKey` único por usuario**: absorbe reintentos de la cola offline, ediciones y carreras entre requests (`isUniqueViolation`, igual que en budget/transaction).
- **`entityType`/`entityId` genéricos** en vez de `budgetId`: la tabla no se acopla a presupuestos.
- **Preferencias por canal y tipo** en `UserPreference.extras` (`{ notifications: { "budget.exceeded": ["email"] } }`) mientras sean pocas; tabla propia solo si crecen.

## 4. Patrones

| Pieza | Patrón | Responsabilidad |
|---|---|---|
| `NotificationChannel` (`email`, `sms`, `push`) | **Strategy** | `send(notification, user): Promise<DeliveryResult>` |
| `channels` registry | Registro / Factory | `Record<Channel, NotificationChannel>`, igual que los providers de billing |
| `notificationTypes` | Registro de definiciones | Por `type`: canales por defecto, plantilla por canal, `href`, si es crítica |
| `notify()` | Fachada | Único punto de entrada para cualquier feature |
| `dispatchPending()` | Outbox | Envía deliveries `pending`; el cron reintenta con backoff |

Ubicación (según la arquitectura de features):

```
src/features/notification/
  lib/        types.ts, definitions.ts (budget.alert, budget.exceeded, …), render.ts, backoff.ts
  server/     notify.ts, dispatch.ts, channels/{email,sms,push}.ts
  services/   notification.service.ts
  stores/     notification.store.ts (React Query)
  hooks/      useNotifications.ts, useUnreadCount.ts
  ui/         notification-bell.tsx, notification-list.tsx
src/features/budget/server/evaluate-budget.ts
```

`budget` depende de `notification`, nunca al revés.

## 5. Tiempo real: evaluación

| Opción | En Vercel | Veredicto |
|---|---|---|
| WebSocket propio | No soportado en funciones | Descartado |
| SSE | Posible, pero corta al llegar a `maxDuration` y ocupa una función por pestaña abierta | No compensa ahora |
| Servicio gestionado (Pusher, Ably, Supabase Realtime) | Sí | Solo si hace falta latencia < 5 s entre dispositivos |
| **Polling con React Query** (`refetchInterval` 60 s + al enfocar + tras sincronizar la cola offline) | Sí | **Recomendado v1** |
| **Web Push** | Sí, con el service worker existente | Para avisar con la app cerrada |

El dispositivo que registra el gasto no necesita tiempo real: al completarse la mutación se invalida `notifications` y aparece al instante. El polling cubre el resto con un endpoint barato (`GET /api/notifications/unread-count`, index `userId, readAt`).

## 6. API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/notifications?cursor=` | Lista paginada |
| GET | `/api/notifications/unread-count` | Badge |
| PATCH | `/api/notifications/:id` | `{ read: true }` / `{ archived: true }` |
| POST | `/api/notifications/read-all` | Marcar todas |
| POST/DELETE | `/api/notifications/push-subscription` | Alta/baja de push |
| GET | `/api/cron/notifications` | Reintentos y limpieza (`CRON_SECRET`) |

## 7. Seguridad y operación

- **Autorización**: todo query filtra por `userId`; `PATCH` usa `updateMany({ where: { id, userId } })` para no revelar existencia.
- **Sin PII ni HTML en `data`**: solo ids y cifras. El render escapa todo; en email no se interpola texto del usuario sin escapar (nombre de categoría).
- **Costes y abuso**: tope diario por usuario y canal (reutilizar `UsageLimit`); SMS solo Pro y solo para tipos críticos.
- **Email**: enlace de baja por tipo (token firmado) y cabecera `List-Unsubscribe`. Alertas de presupuesto = transaccional opcional, no marketing.
- **Push**: claves VAPID en env; borrar la suscripción cuando el proveedor responde 404/410.
- **SMS**: teléfono verificado (OTP) antes de habilitar el canal; hoy `User` no tiene teléfono.
- **Retención**: el cron borra leídas > 90 días y deliveries > 30 días.
- **Derechos del usuario**: incluir notificaciones en `/api/account/export`; el borrado de cuenta ya cascadea.
- **Plan**: si el usuario baja a Free, ¿se siguen evaluando presupuestos existentes? Decidir (propuesta: sí in-app, no canales externos).
- **Observabilidad**: logs `notification.created`, `notification.delivery_failed` con `type`/`channel`, sin contenido.
- **Feature flag** `notifications` (kill switch) para desactivar envíos externos sin deploy.

## 8. Reglas del presupuesto

Dos tipos de notificación:

| Tipo | Origen | Configurable |
|---|---|---|
| `budget.alert` | Umbral definido por el usuario **antes** del límite (90 % o "avísame a los 700") | Sí, en `budget_alert` |
| `budget.exceeded` | Gasto > límite: "Te pasaste de tu límite" | No, siempre existe para todo presupuesto |

```prisma
model BudgetAlert {
  id        String   @id @default(uuid())
  budgetId  String
  kind      String                      // "percent" | "amount"
  value     Decimal  @db.Decimal(12, 2) // 90 | 700
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())

  budget Budget @relation(fields: [budgetId], references: [id], onDelete: Cascade)

  @@unique([budgetId, kind, value])
  @@map("budget_alert")
}
```

**Evaluación** (por periodo, `limit = limitAt(budget, period.from)`):

```ts
const threshold = alert.kind === "percent" ? (limit * alert.value) / 100 : alert.value;
if (spent > limit) return notify("budget.exceeded", `budget.exceeded:${budget.id}:${period.from}`);
if (exceededAlreadySent) return;
for (const alert of alerts) {
  const threshold = alert.kind === "percent" ? (limit * alert.value) / 100 : alert.value;
  if (threshold < limit && spent >= threshold) notify("budget.alert", `budget.alert:${alert.id}:${period.from}`);
}
```

- **Se guarda la unidad tal como la escribió el usuario**: el porcentaje se ajusta solo si cambia el límite; el monto se mantiene fijo.
- **Validación al crear**: `percent` entre 1 y 99; `amount` > 0 y < límite vigente.
- **Si luego se baja el límite** y un monto queda ≥ límite, la alerta no se borra: se omite en la evaluación (ya la cubre `budget.exceeded`) y la UI la marca como inactiva.
- **Una vez por periodo**: la `dedupeKey` lleva `alert.id`/`budget.id` + `period.from`. 
- **El exceso tiene prioridad**: si un gasto cruza una alerta y el límite a la vez, solo se envía `budget.exceeded`. Tampoco se envían alertas más tarde en ese periodo aunque el gasto vuelva a bajar (por edición o borrado), para no avisar "llegaste al 90 %" después de "te pasaste".
- **Máximo 5 alertas por presupuesto**. Por defecto al crear: 80 %.
- `data` guarda la foto del momento: `{ budgetId, alertId?, kind?, value?, spent, limit, periodFrom }`.
- Periodo en la zona horaria del usuario (`UserPreference.timezone`), no en UTC del servidor.
- Resumen opcional al cierre del periodo (cron diario) como segundo tipo: `budget.period_summary`.

## 9. Entregas sugeridas

1. Tablas + `notify()` + canal in-app + campana con polling + `budget.alert` / `budget.exceeded`.
2. Canal email + preferencias + enlace de baja + cron de reintentos.
3. Web Push (`push_subscription`, VAPID, handler en el service worker).
4. SMS (verificación de teléfono, proveedor, topes).

## 10. Implementado (entrega 1 + email)

| Pieza | Dónde |
|---|---|
| Tablas `notification`, `notification_delivery`, `budget_alert` | `prisma/migrations/20261001000000_notifications` |
| `notify()` (fachada) | `features/notification/server/notify.ts` |
| Strategy + registro de canales | `features/notification/server/channels/` (`email`) |
| Envío, reclamo con lease y backoff | `features/notification/server/deliver.ts`, `lib/retry.ts` |
| Evaluación del presupuesto | `features/budget/server/check.ts` + `lib/alerts.ts` (pura) |
| Campana + hoja (polling 60 s) | `features/notification/ui/`, `stores/notification.store.ts` |

**API**

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/notification` | Últimas 50 + `unreadCount` |
| POST | `/api/notification/read` | Marca todas como leídas (al cerrar la hoja) |
| GET/PUT | `/api/budget/:id/alerts` | Lee / reemplaza las alertas (Pro) |
| GET | `/api/cron/notifications` | Reintentos (`CRON_SECRET`, diario 11:00 UTC) |

**Cambios respecto a la propuesta (KISS)**

- Se evalúa **solo el periodo de hoy** en la zona del usuario: registrar un gasto de un mes pasado no avisa.
- Si se cruzan varias alertas a la vez, se envía solo la **más alta**; nunca una menor después de una mayor.
- `data` guarda una foto (`categoryName`, `currency`, `spent`, `limit`): el texto no cambia si luego se edita la categoría.
- Sin `entityType`, `archivedAt`, `providerId`, `error`, `PATCH` por id ni paginación: se añaden cuando haya un caso de uso.
- La retención borra **todas** las notificaciones de más de 90 días (las deliveries caen en cascada), en `cron/cleanup`.
- Un reintento entre la respuesta y el cron: el cron es diario (compatible con Vercel Hobby); con plan Pro puede ser cada 15 min.

**Activación del email**: flag `notifications-email` (apagado si no existe). Sin él solo se crea la notificación in-app.

**Pendiente**: UI para configurar alertas, preferencias por tipo/canal, enlace de baja + `List-Unsubscribe`, incluir notificaciones en el export de la cuenta, tope diario por canal, push y SMS.
