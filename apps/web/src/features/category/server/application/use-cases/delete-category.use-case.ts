import { fail } from "../../domain/errors/category.errors";
import type { CategoryRepository } from "../../domain/repositories/category.repository";

export class DeleteCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(userId: string, id: string) {
    const result = await this.categoryRepository.deleteOwned(userId, id);

    if (result === "not_found") return fail("not_found");
    if (result === "has_transactions") return fail("has_transactions");

    return { ok: true as const };
  }
}
