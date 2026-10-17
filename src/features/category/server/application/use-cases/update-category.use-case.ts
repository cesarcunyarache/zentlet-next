import { sanitizeSuggestions } from "../../../ai/lib/normalize-suggestions";
import type { UpdateCategoryInput } from "../../../schemas/category-api.schema";
import type { CategoryChanges } from "../../domain/entities/category.entity";
import { fail } from "../../domain/errors/category.errors";
import type { CategoryRepository } from "../../domain/repositories/category.repository";

function toChanges({ aiSuggestions, ...fields }: UpdateCategoryInput): CategoryChanges {
  if (aiSuggestions === undefined) return fields;
  return { ...fields, aiSuggestions: sanitizeSuggestions(aiSuggestions) };
}

export class UpdateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(userId: string, id: string, input: UpdateCategoryInput) {
    const updated = await this.categoryRepository.updateOwned(userId, id, toChanges(input));
    if (updated === "not_found") return fail("not_found");
    return { category: updated };
  }
}
