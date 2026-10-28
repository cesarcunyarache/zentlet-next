export type TransactionError = "not_found" | "category_not_found" | "id_taken" | "invalid_cursor";

export const fail = <E extends TransactionError>(error: E) => ({ error });
