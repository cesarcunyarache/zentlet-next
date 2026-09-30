# Features y entitlements

Qué funcionalidades tiene cada usuario según su plan. Complementa [payments.md](payments.md).

## 1. Conceptos

| Pregunta | Pieza | Dónde |
|---|---|---|
| ¿Quién eres? | Authentication | Better Auth → `userId` |
| ¿Pagaste? ¿Cómo está tu contrato? | Subscription | tabla `subscription` |
| ¿Qué plan tienes hoy? | `effectivePlan()` | `billing/lib/entitlements.ts` |
| ¿Qué incluye tu plan? | `can(plan, feature)` | `billing/lib/entitlements.ts` |
| ¿Este recurso es tuyo? | Authorization | `where: { userId }` en cada query |

Entitlement ≠ feature flag: el primero depende de lo pagado; los flags (lanzamientos, experimentos) irían en PostHog.

## 2. Catálogo (código)

`src/features/billing/lib/plans.ts`

| Feature | Free | Pro |
|---|:-:|:-:|
| `transactions` | ✓ | ✓ |
| `dashboard` | ✓ | ✓ |
| `categories` | ✓ | ✓ |
| `ai` (voz, sugerencias) | ✓ | ✓ |
| `budgets` (crear y cambiar topes) | — | ✓ |
| `export` (Excel) | — | ✓ |

| Plan | Precio |
|---|---|
| `free` | — |
| `pro` | S/ 14.90 al mes (`1490` céntimos, `PEN`, `month`) · prueba 15 días (`TRIAL_DAYS`) |

Catálogo en código porque cada feature exige código que la verifique; la BD sólo guarda `planKey` y la foto del precio. Pasar a tablas (`plan`, `plan_feature`) no migra suscripciones.

## 3. Plan efectivo

```
últimas 10 suscripciones del usuario → la primera que hoy da acceso → su planKey · si ninguna → free
```

| Estado | Da acceso |
|---|---|
| `active` | siempre |
| `trialing` | hasta `trialEndsAt` |
| `past_due` | hasta `currentPeriodEnd` + 10 días |
| `canceled` | hasta `currentPeriodEnd` |
| `pending` | nunca |

Una `pending` nueva no tapa una `canceled` todavía vigente. Un `planKey` que ya no existe en el catálogo cae en `free`.

## 4. Dónde se valida

| Capa | Mecanismo | Seguridad |
|---|---|---|
| Route Handler | `requireFeature(userId, feature)` → `403 { message: "Upgrade required", feature }` | **Sí** |
| UI | `useBillingSummary().canUse(feature)` → muestra `UpgradePrompt` | No, sólo UX |

| Ruta protegida | Feature |
|---|---|
| `POST /api/budget` | `budgets` |
| `PUT /api/budget/[id]/limits/[effectiveFrom]` | `budgets` |
| `GET /api/account/export` | `export` |

Leer y borrar presupuestos sigue permitido: quien vuelve a Free conserva y puede limpiar lo que creó.

| UI | Comportamiento sin la feature |
|---|---|
| Ajustes → Plan | Estado, fecha de renovación/fin, botón *Probar 15 días* / *Mejorar a Pro* / *Cancelar* (doble toque) |
| Ajustes → Datos | Botón de exportar reemplazado por *Probar 15 días* |
| Hoja de presupuesto | Botón *Guardar* reemplazado por *Probar 15 días*; *Quitar* sigue disponible |

Mientras el resumen carga, `canUse` devuelve `true` para no parpadear un paywall a usuarios Pro; el backend sigue siendo la barrera.

## 5. Agregar una feature de pago

1. Añadir la key a `FEATURES` y al plan `pro` en `plans.ts`.
2. `requireFeature(userId, "<feature>")` en cada ruta o acción que la use.
3. `canUse("<feature>")` + `UpgradePrompt` en la UI.
4. Test de ruta: 403 en free, 200 en pro (mock de `subscription.findMany`).

## 6. Evolución (no implementado)

| Necesidad | Solución |
|---|---|
| Límites por plan (p. ej. 3 presupuestos en free) | `limits` en el catálogo + `requireLimit()` |
| Regalar Pro / acceso anticipado | Tabla `user_feature (userId, featureKey, expiresAt?)` consultada por `can()` |
| Editar planes sin deploy | Tablas `plan` + `plan_feature`; `subscription.planKey` → FK |
| Rollouts / experimentos | Feature flags de PostHog |
