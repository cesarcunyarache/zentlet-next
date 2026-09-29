import type { CategoryIcon } from "../ai/schemas/category-ai.schema";

export interface TCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  aiSuggestions: CategoryIcon[] | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type TCategoryPayload = Pick<TCategory, "name" | "icon" | "color"> & {
  description?: string;
  aiSuggestions?: CategoryIcon[] | null;
};

export interface CategoryBase {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export interface EditableCategory extends CategoryBase {
  description?: string | null;
}
