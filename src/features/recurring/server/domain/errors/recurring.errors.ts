export type RecurringError = "not_found";

export const fail = <E extends RecurringError>(error: E) => ({ error });
