import { Injectable } from '@nestjs/common';
import type { Category } from '../../../domain/category.js';
import { CategoryRepository } from '../../../domain/category.repository.js';
import type { CreateCategoryInput } from './create-category.input.js';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    const now = new Date();
    const category: Category = {
      id: crypto.randomUUID(),
      userId: input.userId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };

    return this.categoryRepository.save(category);
  }
}
