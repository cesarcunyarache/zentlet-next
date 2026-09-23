export type TransactionType = "expense" | "income";

export interface TTransaction {
  id: string;
  description: string;
  /** Siempre positivo. El signo lo aporta `type`. */
  amount: number;
  type: TransactionType;
  categoryId: string;
  /** ISO corto `YYYY-MM-DD`: la fecha de un movimiento no tiene hora. */
  transactionDate: string;
  reference?: string | null;
}

export type Period = "month" | "previous" | "all";

/** Lo mínimo que la UI necesita de una categoría, venga de la API o no. */
export interface CategoryLike {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

/**
 * Campos de un movimiento sin su id. Al crear, el id lo genera el cliente
 * (`crypto.randomUUID`) para poder guardar sin conexión.
 */
export type TTransactionPayload = Omit<TTransaction, "id">;
