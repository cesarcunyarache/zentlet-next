import { fail } from "../../domain/errors/category.errors";
import type { CategoryRepository } from "../../domain/repositories/category.repository";

export class DeleteCategoryUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  async execute(userId: string, id: string) {
    const deleted = await this.categories.deleteOwned(userId, id);
    if (deleted === "has_transactions") return fail("has_transactions");
    return deleted ? { ok: true as const } : fail("not_found");
  }
}
