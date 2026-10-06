# Movimientos recurrentes

Un movimiento puede repetirse cada semana, mes, trimestre, semestre o año.
El usuario lo elige con el select **Repetir** al crear el movimiento
(por defecto, «Una sola vez»).

## Modelo

| Tabla | Rol |
|---|---|
| `recurring_transaction` | La plantilla: tipo, monto, categoría, descripción, `frequency`, `anchorDate` (fecha del primer movimiento) y `nextDueDate` |
| `transaction.recurringTransactionId` | Enlaza cada movimiento generado con su plantilla |

- `frequency` es el enum `RecurrenceFrequency` (`WEEKLY`, `MONTHLY`, `QUARTERLY`, `SEMIANNUAL`, `ANNUAL`). Añadir uno (p. ej. `BIWEEKLY`) es una migración `ALTER TYPE … ADD VALUE` y una entrada en `features/recurring/lib/schedule.ts`.
- `@@unique([recurringTransactionId, transactionDate])` hace imposible generar dos veces la misma fecha.
- Borrar la plantilla (`onDelete: SetNull`) conserva los movimientos ya generados.

## Flujo

1. **Alta** — `POST /api/transaction` con `recurrence` crea la plantilla y el primer movimiento en una sola transacción de base de datos. Reenviar la misma alta desde la cola offline devuelve la existente: no duplica la plantilla.
2. **Primera fecha** — la siguiente ocurrencia posterior a `max(anchorDate, hoy del usuario)`. Un primer movimiento con fecha pasada **no** rellena los periodos atrasados.
3. **Cron** — `GET /api/cron/recurring` (00:30 Lima) crea las ocurrencias con `nextDueDate <= hoy` en la zona horaria del usuario, avanza `nextDueDate` y lanza la revisión de presupuestos. Si el cron no corrió unos días, se pone al día (máx. 60 ocurrencias por plantilla y ejecución).
4. **Dejar de repetir** — `DELETE /api/recurring-transaction/:id` desde el detalle del movimiento.

## Fechas

Cada ocurrencia se calcula desde `anchorDate`, nunca desde la anterior: una plantilla del 31 cae el 28/29 en febrero y vuelve al 31 en marzo.

## Fuera de esta versión

- Editar la plantilla (hoy: dejar de repetir y crear otra).
- Modo «por confirmar» para montos variables (luz, agua), reutilizando la bandeja del inbox.
- Lista de todas las recurrentes y «próximos pagos del mes».
- Gating por plan: hoy está disponible para todos.
