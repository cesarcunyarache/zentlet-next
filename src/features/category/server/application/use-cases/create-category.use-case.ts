import { sanitizeSuggestions } from "../../../ai/lib/normalize-suggestions";
import type { CreateCategoryInput } from "../../../schemas/category-api.schema";
import { MAX_CATEGORIES, type NewCategory } from "../../domain/entities/category.entity";
import { fail } from "../../domain/errors/category.errors";
import type { CategoryRepository } from "../../domain/repositories/category.repository";

function toNewCategory(
  userId: string,
  input: CreateCategoryInput,
): NewCategory {
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
    const foundCategory = await this.categoryRepository.findById(input.id);

    if (foundCategory && foundCategory.userId !== userId) {
      return fail("id_taken");
    }

    if (foundCategory) {
      return {
        category: foundCategory,
        created: false,
      };
    }

    const countCategories = await this.categoryRepository.countOwned(userId);

    const isLimitReached = countCategories >= MAX_CATEGORIES;

    if (isLimitReached) return fail("limit_reached");

    const created = await this.categoryRepository.insert(
      toNewCategory(userId, input),
    );

    if (created === "id_taken") return this.concurrentWinner(userId, input.id);

    return { category: created, created: true };
  }

  private async concurrentWinner(userId: string, id: string) {
    const winner = await this.categoryRepository.findOwned(userId, id);
    return winner ? { category: winner, created: false } : fail("id_taken");
  }
}
