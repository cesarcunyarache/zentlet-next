import type { ErrorTable } from "@/lib/api/route-helpers";
import type { RecurringError } from "../../domain/errors/recurring.errors";

export const RECURRING_ERRORS: ErrorTable<RecurringError> = {
  not_found: ["Recurring transaction not found", 404],
};
