import type { ErrorTable } from "@/lib/api/route-helpers";
import type { TransactionError } from "../server/transactions";

export const TRANSACTION_ERRORS: ErrorTable<TransactionError> = {
  not_found: ["Transaction not found", 404],
  category_not_found: ["Category not found", 422],
  id_taken: ["Transaction id already in use", 409],
  invalid_cursor: ["Invalid cursor", 422],
};
