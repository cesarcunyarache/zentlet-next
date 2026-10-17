export type ListError =
  | "not_found"
  | "forbidden"
  | "id_taken"
  | "invalid_cursor"
  | "transaction_not_found"
  | "currency_mismatch"
  | "invite_invalid"
  | "member_not_found"
  | "owner_cannot_leave"
  | "email_failed";

export const fail = <E extends ListError>(error: E) => ({ error });
