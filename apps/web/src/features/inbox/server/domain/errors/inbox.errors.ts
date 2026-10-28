export type InboxError =
  | "not_found"
  | "category_not_found"
  | "sender_not_found"
  | "invalid_sender"
  | "email_import_unavailable";

export const fail = <E extends InboxError>(error: E) => ({ error });
