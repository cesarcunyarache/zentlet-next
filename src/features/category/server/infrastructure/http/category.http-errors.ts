import type { ErrorTable } from "@/lib/api/route-helpers";
import type { CategoryError } from "../../domain/errors/category.errors";

export const CATEGORY_ERRORS: ErrorTable<CategoryError> = {
  not_found: ["Category not found", 404],
  id_taken: ["Category id already in use", 409],
  limit_reached: ["Category limit reached", 422],
  has_transactions: ["Category has transactions", 409],
};
