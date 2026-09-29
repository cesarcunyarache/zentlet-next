export type TransactionType = "expense" | "income";

export interface TTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  transactionDate: string;
  reference?: string | null;
}

export type Period = "month" | "previous" | "all";

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
  nextCursor: string | null;
}

export interface CategoryTotals {
  expense: number;
  income: number;
}

export interface TransactionSummary {
  count: number;
  expenseTotal: number;
  incomeTotal: number;
  byCategory: Record<string, CategoryTotals>;
}

export interface TransactionSummaryResponse extends TransactionSummary {
  presentIds: string[];
}

export interface CategoryLike {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface CategoryTotal {
  category: CategoryLike;
  total: number;
  budget: number | null;
}

export type TTransactionPayload = Omit<TTransaction, "id">;

export type SpeechError = "unsupported" | "denied" | "no-mic" | "no-speech" | "network" | "unknown";
export type SpeechStatus = "idle" | "starting" | "listening" | "done" | "error";
