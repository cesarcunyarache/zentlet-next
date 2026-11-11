import { describe, expect, it } from 'vitest';
import { InMemoryCategoryRepository } from '../../../infrastructure/in-memory-category.repository.js';
import { CreateCategoryUseCase } from '../create-category/create-category.use-case.js';
import { ListCategoriesUseCase } from './list-categories.use-case.js';

describe('ListCategoriesUseCase', () => {
  it('returns only the categories owned by the given user', async () => {
    const repository = new InMemoryCategoryRepository();
    const createCategory = new CreateCategoryUseCase(repository);
    const listCategories = new ListCategoriesUseCase(repository);

    const owned = await createCategory.execute({ userId: 'user-1', name: 'Rent', icon: 'home', color: '#3b82f6' });
    await createCategory.execute({ userId: 'user-2', name: 'Travel', icon: 'plane', color: '#f97316' });

    expect(await listCategories.execute({ userId: 'user-1' })).toEqual([owned]);
  });
});
