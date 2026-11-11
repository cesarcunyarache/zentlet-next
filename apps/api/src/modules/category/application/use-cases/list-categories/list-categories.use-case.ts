import { Injectable } from '@nestjs/common';
import type { Category } from '../../../domain/category.js';
import { CategoryRepository } from '../../../domain/category.repository.js';
import type { ListCategoriesInput } from './list-categories.input.js';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: ListCategoriesInput): Promise<Category[]> {
    return this.categoryRepository.findByUserId(input.userId);
  }
}
