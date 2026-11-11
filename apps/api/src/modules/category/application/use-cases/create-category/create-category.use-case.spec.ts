import { describe, expect, it } from 'vitest';
import { InMemoryCategoryRepository } from '../../../infrastructure/in-memory-category.repository.js';
import { CreateCategoryUseCase } from './create-category.use-case.js';

describe('CreateCategoryUseCase', () => {
  it('creates a category and persists it through the repository', async () => {
    const repository = new InMemoryCategoryRepository();
    const useCase = new CreateCategoryUseCase(repository);

    const category = await useCase.execute({
      userId: 'user-1',
      name: 'Groceries',
      icon: 'cart',
      color: '#22c55e',
    });

    expect(category).toMatchObject({
      userId: 'user-1',
      name: 'Groceries',
      icon: 'cart',
      color: '#22c55e',
      description: null,
    });
    expect(await repository.findByUserId('user-1')).toEqual([category]);
  });
});
