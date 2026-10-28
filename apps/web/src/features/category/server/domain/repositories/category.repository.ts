import type { Category, CategoryChanges, NewCategory } from "../entities/category.entity";

export interface CategoryRepository {
  findAll(userId: string): Promise<Category[]>;

  findById(id: string): Promise<Category | null>;

  findOwned(userId: string, id: string): Promise<Category | null>;

  countOwned(userId: string): Promise<number>;

  insert(category: NewCategory): Promise<Category | "id_taken">;

  updateOwned(userId: string, id: string, changes: CategoryChanges): Promise<Category | "not_found">;

  deleteOwned(userId: string, id: string): Promise<"deleted" | "not_found" | "has_transactions">;
}
