import type { ErrorTable } from "@/lib/api/route-helpers";
import type { ListError } from "../../domain/errors/list.errors";

export const LIST_ERRORS: ErrorTable<ListError> = {
  not_found: ["List not found", 404],
  forbidden: ["Not allowed in this list", 403],
  id_taken: ["List id already in use", 409],
  invalid_cursor: ["Invalid cursor", 422],
  transaction_not_found: ["Transaction not found", 422],
  currency_mismatch: ["List currency differs from your account currency", 409],
  invite_invalid: ["Invite is invalid or expired", 410],
  member_not_found: ["Member not found", 404],
  owner_cannot_leave: ["The owner cannot leave the list", 409],
  email_failed: ["The invite email could not be sent", 502],
};
