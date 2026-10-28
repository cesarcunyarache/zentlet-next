# Billing: auditoría y pendientes

Revisión de la implementación descrita en [payments.md](payments.md). Estado: código y tests listos; **sin probar aún contra el sandbox de Mercado Pago** (la cuenta no tiene aplicación creada).

## 1. Seguridad

| Riesgo | Medida implementada |
|---|---|
| Secretos en el cliente | `MERCADOPAGO_*` y `BILLING_ADMIN_SECRET` sólo en servidor; nada `NEXT_PUBLIC_` |
| Precio/plan manipulado desde el cliente | El cliente sólo envía `planKey` validado con `z.enum`; importe, moneda, intervalo y prueba los decide el servidor |
| Webhook falso | HMAC-SHA256 de `id;request-id;ts` con la clave secreta, `timingSafeEqual`, tolerancia de ±5 min (anti-replay) |
| Webhook con datos falsos pero firma válida | Nunca se usa el payload: se re-consulta el recurso a MP con nuestro token |
| Recurso ajeno | `external_reference` debe coincidir con `subscription.id`; si no, se ignora y se registra |
| Proveedor inventado en la URL | `isProviderName` → 401 |
| Payload enorme | Webhook limitado a 16 KB |
| Datos de tarjeta | Nunca pasan por la app: checkout alojado por MP (sin PAN/CVV/tokens) |
| PII en logs y auditoría | `billing_event.data` sólo guarda estados, importes y modos; sin email ni payload |
| Endpoint de reembolsos | Bearer con comparación en tiempo constante (`hasBearerSecret`); sin secreto configurado, nadie pasa |
| Abuso de endpoints | `writeLimit` (120/min por usuario) en checkout, cancel y sync |
| Acceso a features | `requireFeature` en el Route Handler; la UI sólo oculta |
| Borrado de cuenta con cobro activo | `beforeDelete` cancela en MP; si falla, no se borra |
| Integridad en BD | CHECK de estados, importes > 0, `0 ≤ refundedAmount ≤ amount`, índice parcial de una suscripción viva |

## 2. Idempotencia y concurrencia

| Escenario | Mecanismo | Resultado |
|---|---|---|
| Doble clic en *Probar* | Reuso de `pending` < 24 h + índice parcial único | Misma URL o 409 |
| Dos pestañas a la vez | `INSERT` choca con el índice parcial (P2002) | 409 `Checkout in progress` |
| Reintento de red al crear en MP | `X-Idempotency-Key: checkout:{subscriptionId}` | MP no crea dos preapprovals |
| Webhook repetido | `UNIQUE(provider, externalId)` + `processedAt` | `duplicate`, sin efectos |
| Webhook que falló a mitad | `processedAt = null` → el reintento de MP lo reprocesa | Converge |
| Webhooks fuera de orden | Siempre se escribe el estado actual consultado a MP | El orden no importa |
| Cancelar dos veces | Sin suscripción viva → no-op | 200 |
| Reembolso repetido | `X-Idempotency-Key: refund:{id}:{refundedAmount}` | MP no duplica |
| Dos reembolsos simultáneos | `updateMany where refundedAmount = previo` | El segundo recibe 409 |
| Cron y webhook a la vez | Ambos escriben el mismo snapshot | Idempotente |

## 3. Registro y control

| Qué | Dónde |
|---|---|
| Cada notificación de MP (tipo, recurso, procesada o no) | `billing_event` (`source = webhook`) |
| Checkout iniciado/abandonado, cambios de estado, cancelaciones, reembolsos | `billing_event` (`user`, `system`, `admin`) con `from/to` |
| Historial de cobros y reembolsos | `billing_payment` |
| Logs estructurados | Pino `billing.*`, `cron.billing_sync` |
| Errores | Sentry vía `internalError` / `reportError` (reconciliación por suscripción) |
| Producto | PostHog: `checkout_started`, `subscription_canceled` |

Consulta útil: `SELECT type, data, "createdAt" FROM billing_event WHERE "subscriptionId" = $1 ORDER BY "createdAt";`

## 4. Escalabilidad

| Punto | Estado |
|---|---|
| Entitlement por petición protegida | 1 query por índice `(userId, status)` sobre ≤ 10 filas |
| Webhooks | Sin estado en memoria: cualquier instancia serverless procesa cualquier evento |
| Cron | Lotes de 100, ordenados por `updatedAt`; un fallo no detiene el resto |
| Cambiar de pasarela | Nueva carpeta en `providers/` + registro; BD sin cambios |
| Varias pasarelas a la vez | Cada suscripción usa su `provider`; sólo las nuevas usan `BILLING_PROVIDER` |
| Backend separado | La UI sólo habla HTTP (`billingService`); mover `server/`, `providers/`, `lib/` y rutas + cambiar `NEXT_PUBLIC_API_URL` y la URL del webhook |
| Crecimiento de `billing_event` | Sin política de retención (ver pendientes) |

## 5. Buenas prácticas aplicadas

| Práctica | Dónde |
|---|---|
| SRP | Route Handler (HTTP) · `server/` (orquestación + BD) · `lib/` (reglas puras) · `providers/` (pasarela) |
| OCP / DIP | Nuevas pasarelas sin tocar dominio; el dominio depende del puerto `BillingProvider` |
| KISS / YAGNI | Catálogo en código, sin repositorios, sin colas, sin tabla de idempotency keys |
| Dinero en enteros | Céntimos en BD y dominio; conversión sólo en el adaptador (`toCents`/`fromCents`) |
| Fallar en vez de adivinar | Estado desconocido de MP → error y reintento |
| Tests del comportamiento | 88 tests nuevos (lib, adaptador, rutas) + 403 en rutas protegidas |
| Sin comentarios en feature | Nombres y tests documentan; la documentación vive en `docs/` |

## 6. Verificar en sandbox antes de producción

| Suposición | Por qué verificar |
|---|---|
| `start_date` futuro funciona con `status: pending` (prueba) | La doc lo muestra en preapprovals autorizadas; con pendiente no hay ejemplo |
| Las notificaciones de suscripción traen `data.id` en la query | La firma lo usa; si no viene, el manifest lo omite y debe seguir validando |
| `body.id` es estable entre reintentos | Es la clave de idempotencia del webhook |
| `next_payment_date` avanza tras cada cobro | Define `currentPeriodEnd` |
| Cargo de verificación de tarjeta al autorizar | MP lo hace y lo devuelve; no debe crear `billing_payment` aprobado |
| Tiempo de respuesta del webhook < 22 s | Hace hasta 3 llamadas a MP (10 s de timeout cada una) |

Pasos: crear la aplicación en Mercado Pago Developers → credenciales de prueba → usuarios de prueba (vendedor/comprador) → configurar webhook (tool `save_webhook` del MCP) → probar con tarjetas de prueba (`APRO`, `OTHE`, `FUND`) → ejecutar `quality_checklist` del MCP.

## 7. Prorrateo de cambios de plan

Hoy hay un solo plan: no hay upgrades ni downgrades. Cuando existan:

| Cambio | Estrategia recomendada |
|---|---|
| Upgrade (Basic → Pro) | Acceso inmediato. Cobro único de la diferencia prorrateada `unusedAmount(nuevo) − unusedAmount(actual)` con Checkout Pro; después `PUT /preapproval/{id}` con el nuevo `transaction_amount` (aplica desde el siguiente ciclo) |
| Downgrade (Pro → Basic) | Sin reembolso; se programa para `currentPeriodEnd` (`PUT` del importe al final del periodo) |
| Mensual → anual | Nueva suscripción con `start_date = currentPeriodEnd` (reutiliza `firstChargeDate`) y cancelación de la mensual |

`billing_day_proportional` de MP sólo existe en suscripciones con plan asociado; por eso el cálculo vive en `lib/proration.ts`.

## 8. Lo que todavía no está considerado

| Tema | Impacto | Propuesta |
|---|---|---|
| **Comprobantes electrónicos (SUNAT)** | Obligatorio vender con boleta/factura en Perú | Integrar un OSE/PSE (Nubefact, etc.) al recibir `approved` |
| **IGV** | ¿S/ 14.90 incluye el 18 %? Cambia ingresos y comprobantes | Decidir y mostrar "IGV incluido" |
| **Correos transaccionales** | Aviso de fin de prueba (3 días antes), cobro exitoso/fallido, cancelación | Reutilizar Resend (`src/lib/email`) desde `applySnapshot`/`recordPayment` |
| **Términos de la suscripción** | Renovación automática, prueba, cancelación y reembolsos deben estar en `/legal/terms` (Código de Protección al Consumidor) | Actualizar textos legales y versión de consentimiento |
| **Reembolsos hechos desde el panel de MP** | No se reflejan en `billing_payment` (el tópico `payment` se ignora) | Manejar tópico `payment` o conciliar manualmente |
| **Contracargos** | Un chargeback no quita el acceso | Suscribir `topic_chargebacks_wh` y revocar acceso |
| **Cambiar tarjeta** | Sin UI; el usuario debe hacerlo en su cuenta de MP | `PUT /preapproval/{id}` con `card_token_id` |
| **Abuso de pruebas** | Varias cuentas = varias pruebas | Limitar por `payer_id` de MP o exigir correo verificado (ya activo con Resend) |
| **Panel de soporte** | Reembolsos sólo por API con secreto | Página interna con rol admin |
| **Retención de `billing_event`** | Crece sin límite | Borrar eventos de webhook procesados > 12 meses en el cron de limpieza |
| **Offline** | Un presupuesto creado offline por un usuario free recibe 403 al sincronizar y se descarta | La UI ya lo impide; opcional: aviso específico en la cola |
| **Reactivar sin nuevo checkout** | Cancelar es definitivo en MP; volver = nuevo checkout (sin cobro doble gracias a `firstChargeDate`) | Suficiente para v1 |
| **Multi-moneda / precios por país** | Sólo PEN | `price` por moneda en el catálogo cuando haga falta |
| **Métricas de negocio** | MRR, churn, conversión de prueba | Consultas sobre `subscription` + funnels en PostHog |
| **Rotación de secretos** | La clave de webhook no caduca | Rotarla periódicamente (MP → Restablecer) |
