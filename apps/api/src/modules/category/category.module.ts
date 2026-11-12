import { Module } from '@nestjs/common';
import { CreateCategoryUseCase } from './application/use-cases/create-category/create-category.use-case.js';
import { ListCategoriesUseCase } from './application/use-cases/list-categories/list-categories.use-case.js';
import { CategoryRepository } from './domain/category.repository.js';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository.js';

@Module({
  providers: [
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    { provide: CategoryRepository, useClass: PrismaCategoryRepository },
  ],
  exports: [CreateCategoryUseCase, ListCategoriesUseCase],
})
export class CategoryModule {}
