import type { Category } from './category.js';

export abstract class CategoryRepository {
  abstract save(category: Category): Promise<Category>;
  abstract findByUserId(userId: string): Promise<Category[]>;
}
