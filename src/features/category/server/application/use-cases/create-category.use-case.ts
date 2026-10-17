import { sanitizeSuggestions } from "../../../ai/lib/normalize-suggestions";
import type { CreateCategoryInput } from "../../../schemas/category-api.schema";
import { MAX_CATEGORIES, type NewCategory } from "../../domain/entities/category.entity";
import { fail } from "../../domain/errors/category.errors";
import type { CategoryRepository } from "../../domain/repositories/category.repository";

function toNewCategory(userId: string, input: CreateCategoryInput): NewCategory {
  return {
    id: input.id,
    userId,
    name: input.name,
    icon: input.icon,
    color: input.color,
    description: input.description ?? null,
    aiSuggestions: sanitizeSuggestions(input.aiSuggestions),
  };
}

export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(userId: string, input: CreateCategoryInput) {
    const existing = await this.categoryRepository.findById(input.id);

    if (existing) {
      const belongsToAnotherUser = existing.userId !== userId;
      if (belongsToAnotherUser) return fail("id_taken");
      return { category: existing, created: false };
    }

    const ownedCount = await this.categoryRepository.countOwned(userId);
    if (ownedCount >= MAX_CATEGORIES) return fail("limit_reached");

    const created = await this.categoryRepository.insert(toNewCategory(userId, input));
    if (created === "id_taken") return this.findRetriedCreation(userId, input.id);

    return { category: created, created: true };
  }

  private async findRetriedCreation(userId: string, id: string) {
    const category = await this.categoryRepository.findOwned(userId, id);
    if (!category) return fail("id_taken");
    return { category, created: false };
  }
}
