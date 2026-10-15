export type CategoryError = "not_found" | "id_taken" | "limit_reached" | "has_transactions";

export const fail = <E extends CategoryError>(error: E) => ({ error });
