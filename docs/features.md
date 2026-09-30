# Features y entitlements

Qué funcionalidades tiene cada usuario según su plan. Complementa [payments.md](payments.md), que cubre cobro y suscripción.

## 1. Conceptos

| Pregunta | Pieza | Dónde |
|---|---|---|
| ¿Quién eres? | Authentication | Better Auth → `userId` |
| ¿Pagaste? ¿Cómo está tu contrato? | Subscription | tabla `subscription` |
| ¿Qué plan tienes hoy? | `effectivePlan()` | `features/billing/lib` |
| ¿Qué incluye tu plan? | Entitlement: `can(plan, feature)` | `features/billing/lib` |
| ¿Este recurso es tuyo? | Authorization | `where: { userId }` en cada query (ya existe) |

**Entitlement ≠ feature flag.** Un entitlement depende de lo que el usuario pagó. Un feature flag controla lanzamientos (beta, experimento, kill switch) y no tiene nada que ver con el plan. Los flags, si hacen falta, van con PostHog, que ya está integrado. No se mezclan.

## 2. Catálogo en código

```ts
// features/billing/lib/plans.ts
export const FEATURES = ["transactions", "dashboard", "budgets", "export", "ai"] as const;
export type Feature = (typeof FEATURES)[number];

export const PLANS = {
  free: { features: ["transactions", "dashboard"] },
  pro:  {
    features: ["transactions", "dashboard", "budgets", "export", "ai"],
    price: { amount: 1490, currency: "PEN", interval: "month" },
  },
} satisfies Record<string, Plan>;

export type PlanKey = keyof typeof PLANS;
```

**¿Por qué no tablas `features` / `plan_features`?** Porque una feature nueva **siempre exige código**: el guard en la ruta y el paywall en la UI. Una fila en `features` sin ese código no protege nada. Las tablas solo ganan cuando hay que cambiar qué incluye cada plan **sin deploy** (panel de admin, muchos planes, alguien no técnico gestionándolos).

## 3. Plan efectivo del usuario

Solo cuentan las suscripciones que **hoy dan acceso**, no la más reciente (una `pending` nueva no debe tapar una `canceled` todavía vigente):

```ts
// features/billing/server/subscription.ts
const sub = await prisma.subscription.findFirst({
  where: {
    userId,
    OR: [
      { status: "active" },
      { status: { in: ["past_due", "canceled"] }, currentPeriodEnd: { gt: now } },
    ],
  },
  orderBy: { currentPeriodEnd: "desc" },
});

return sub ? sub.planKey : "free";
```

```ts
// features/billing/lib/entitlements.ts (puro, testeable)
export function can(plan: PlanKey, feature: Feature) {
  return PLANS[plan].features.includes(feature);
}
```

Índice: `@@index([userId, status])` en `subscription`.

## 4. Dónde se valida

| Capa | Cómo | ¿Es seguridad? |
|---|---|---|
| Route Handler | `requireFeature(userId, "export")` → 403 | **Sí, la barrera real** |
| Server Action (IA) | mismo `requireFeature` antes de llamar al modelo | **Sí** |
| Frontend | `useBilling()` → `GET /api/billing/me` → `{ plan, features }` | No, solo UX (ocultar, paywall) |

```ts
// features/billing/server/guard.ts — mismo estilo que writeLimit
export async function requireFeature(userId: string, feature: Feature) {
  const plan = await getEffectivePlan(userId);
  if (can(plan, feature)) return null;
  return NextResponse.json({ message: "Upgrade required", feature }, { status: 403 });
}
```

```ts
// en la ruta
const denied = await requireFeature(userId, "export");
if (denied) return denied;
```

El cliente trata el 403 con `feature` como "mostrar paywall", no como error.

## 5. Agregar una feature de pago

1. Añadir la key a `FEATURES` y al plan que la incluye (`plans.ts`).
2. `requireFeature` en cada ruta/acción que la usa.
3. Paywall en la UI con `features.includes(...)`.
4. Test: 403 en free, 200 en pro.

Un deploy. Si una feature pasa de gratis a pago, decidir qué pasa con los datos ya creados (ver riesgos en [payments.md](payments.md)).

## 6. Evolución (no ahora)

| Necesidad | Solución | Impacto |
|---|---|---|
| Límites por plan (p. ej. 3 presupuestos en free) | `limits: { budgets: 3 }` en el catálogo + `requireLimit()` | Solo código |
| Regalar PRO / acceso anticipado a un usuario | Tabla `user_feature (userId, featureKey, expiresAt?)`; `can()` también la consulta | 1 tabla nueva, nada se migra |
| Editar planes sin deploy | Tablas `plan` + `plan_feature (planId, featureKey)`; `subscription.planKey` pasa a FK de `plan.key` | Migración de datos menor |
| Rollouts / experimentos | Feature flags de PostHog | Ninguno en billing |

No hace falta tabla `features`: la lista de keys válidas vive en el código, porque es el código el que las verifica.

## 7. Referencia: Cal.com

| En Cal.com | Qué es | Para nosotros |
|---|---|---|
| `Feature` + `UserFeatures` + `TeamFeatures` | **Feature flags** (lanzamientos, experimentos, kill switches, acuerdos enterprise) | No resuelve plan → features. La idea de overrides por usuario queda para el punto 6 |
| `TeamBilling` / `OrganizationBilling` | Una fila de billing por team/org, con ids de Stripe | Tomamos "una suscripción viva por dueño"; no los campos de Stripe |
| `Payment.data Json` | Guarda el payload completo del proveedor | No: sin datos sensibles ni acoplamiento |
| `@unique` en `externalId` / `idempotencyKey` / `externalRef` | Idempotencia por restricción en BD | **Sí**, igual que `billing_event` y `subscription` |
| `User.trialEndsAt`, `Team.pendingPayment`, `metadata Json` | Estado de billing repartido en columnas sueltas | No: todo el estado va en `subscription` |
| `CreditBalance` + logs | Créditos por consumo (SMS, IA) | Quizá algún día para la IA por uso |
