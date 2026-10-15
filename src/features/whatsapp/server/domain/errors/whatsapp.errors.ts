export type WhatsappError = "not_available" | "not_linked";

export const fail = <E extends WhatsappError>(error: E) => ({ error });
