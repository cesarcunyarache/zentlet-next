import { Injectable } from '@nestjs/common';
import type { Category } from '../domain/category.js';
import { CategoryRepository } from '../domain/category.repository.js';

@Injectable()
export class InMemoryCategoryRepository extends CategoryRepository {
  private readonly categories = new Map<string, Category>();

  async save(category: Category): Promise<Category> {
    this.categories.set(category.id, category);
    return category;
  }

  async findByUserId(userId: string): Promise<Category[]> {
    return [...this.categories.values()].filter((category) => category.userId === userId);
  }
}
