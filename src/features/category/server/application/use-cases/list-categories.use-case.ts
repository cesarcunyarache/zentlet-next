import type { CategoryRepository } from "../../domain/repositories/category.repository";

export class ListCategoriesUseCase {
  constructor(private readonly categories: CategoryRepository) {}

  execute(userId: string) {
    return this.categories.findAll(userId);
  }
}
