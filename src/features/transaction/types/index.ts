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

/** Campos que el cliente envía al crear o actualizar un movimiento. */
export type TTransactionPayload = Omit<TTransaction, "id">;
