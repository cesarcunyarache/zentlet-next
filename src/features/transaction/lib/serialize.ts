import type { TTransaction, TransactionType } from "../types";

/**
 * Fila tal y como sale de Prisma. Se describe de forma estructural para no
 * acoplar esta función al cliente generado.
 */
interface TransactionRow {
  id: string;
  description: string | null;
  amount: { toString(): string };
  type: string;
  categoryId: string;
  transactionDate: Date;
  reference: string | null;
}

/**
 * Traduce la fila de base de datos al contrato que consume la UI:
 * `Decimal` → `number` y `DateTime @db.Date` → `YYYY-MM-DD`.
 * Sin esto el JSON llevaría el monto como string y la fecha con hora.
 */
export function serializeTransaction(row: TransactionRow): TTransaction {
  return {
    id: row.id,
    description: row.description ?? "",
    amount: Number(row.amount),
    type: row.type as TransactionType,
    categoryId: row.categoryId,
    transactionDate: row.transactionDate.toISOString().slice(0, 10),
    reference: row.reference,
  };
}
