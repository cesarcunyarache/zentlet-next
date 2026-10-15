import { vi } from "vitest";
import type { Category, NewCategory } from "../../../domain/entities/category.entity";
import type { CategoryRepository } from "../../../domain/repositories/category.repository";

export function stored(draft: NewCategory): Category {
  return { ...draft, createdAt: new Date(), updatedAt: new Date() };
}

export function fakeRepository(overrides: Partial<CategoryRepository> = {}): CategoryRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findOwned: vi.fn().mockResolvedValue(null),
    countOwned: vi.fn().mockResolvedValue(0),
    insert: vi.fn(async (draft: NewCategory) => stored(draft)),
    updateOwned: vi.fn(),
    deleteOwned: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}
