import { z } from "zod";

/*
 * Contrato de la API de movimientos (lo que valida el servidor). El `id`
 * lo genera el cliente: así se puede crear sin conexión y reintentar sin
 * duplicar (el POST es idempotente por id).
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD");

const fields = {
  description: z.string().trim().max(200),
  amount: z.number().positive().max(9_999_999_999),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().min(1).max(64),
  transactionDate: isoDate,
  reference: z.string().max(200).nullable().optional(),
};

export const createTransactionSchema = z.object({ id: z.uuid(), ...fields });

export const updateTransactionSchema = z.object(fields).partial();

/** Periodo `[from, to)` en fechas locales del cliente; sin ellos, todo el historial. */
const range = {
  from: isoDate.optional(),
  to: isoDate.optional(),
};

export const transactionSummaryQuerySchema = z.object({
  ...range,
  /** Ids con cambios aún en cola: el servidor dice cuáles ya tiene. */
  ids: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",") : []))
    .pipe(z.array(z.uuid()).max(100)),
});

export const transactionListQuerySchema = z.object({
  ...range,
  type: fields.type.optional(),
  categoryId: fields.categoryId.optional(),
  q: z.string().trim().max(60).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});
