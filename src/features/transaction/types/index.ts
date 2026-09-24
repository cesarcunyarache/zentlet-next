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

/** Rango `[from, to)` en ISO corto; vacío = todo el historial. */
export interface DateRange {
  from?: string;
  to?: string;
}

export interface TransactionFilters extends DateRange {
  type?: TransactionType;
  categoryId?: string;
  q?: string;
}

export interface TransactionPage {
  items: TTransaction[];
  /** `null` cuando no quedan más páginas. */
  nextCursor: string | null;
}

export interface CategoryTotals {
  expense: number;
  income: number;
}

/** Agregados de un periodo, calculados en la base de datos. */
export interface TransactionSummary {
  count: number;
  expenseTotal: number;
  incomeTotal: number;
  byCategory: Record<string, CategoryTotals>;
}

export interface TransactionSummaryResponse extends TransactionSummary {
  /** De los ids consultados, los que ya existen en el servidor. */
  presentIds: string[];
}

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
