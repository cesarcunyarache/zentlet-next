import type { DateRange, TransactionFilters } from "../types";

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: ["transactions", "list"] as const,
  list: (filters: TransactionFilters) => ["transactions", "list", filters] as const,
  summaries: ["transactions", "summary"] as const,
  summary: (range: DateRange) => ["transactions", "summary", range] as const,
  detail: (transactionId: string) => ["transactions", transactionId] as const,
};

export const transactionMutationKeys = {
  all: ["transactions", "mutation"] as const,
  create: ["transactions", "mutation", "create"] as const,
  update: ["transactions", "mutation", "update"] as const,
  remove: ["transactions", "mutation", "delete"] as const,
};
