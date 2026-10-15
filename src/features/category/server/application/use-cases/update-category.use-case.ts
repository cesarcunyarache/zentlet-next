import { sanitizeSuggestions } from "../../../ai/lib/normalize-suggestions";
import type { UpdateCategoryInput } from "../../../schemas/category-api.schema";
import type { CategoryChanges } from "../../domain/entities/category.entity";
import { fail } from "../../domain/errors/category.errors";
import type { CategoryRepository } from "../../domain/repositories/category.repository";

function toChanges(input: UpdateCategoryInput): CategoryChanges {
  const { aiSuggestions, ...fields } = input;
  return aiSuggestions === undefined ? fields : { ...fields, aiSuggestions: sanitizeSuggestions(aiSuggestions) };
}

export class UpdateCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(userId: string, id: string, input: UpdateCategoryInput) {
    const updated = await this.categories.updateOwned(userId, id, toChanges(input));
    return updated === "not_found" ? fail("not_found") : { category: updated };
  }
}
