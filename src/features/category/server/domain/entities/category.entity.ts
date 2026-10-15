import type { CategoryIcon } from "../../../ai/schemas/category-ai.schema";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  aiSuggestions: CategoryIcon[] | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewCategory = Pick<
  Category,
  "id" | "userId" | "name" | "icon" | "color" | "description" | "aiSuggestions"
>;

export type CategoryChanges = Partial<Pick<Category, "name" | "icon" | "color" | "description" | "aiSuggestions">>;

export const MAX_CATEGORIES = 200;
