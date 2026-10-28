import type { CategoryRepository } from "../../domain/repositories/category.repository";

export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  execute(userId: string) {
    return this.categoryRepository.findAll(userId);
  }
}
