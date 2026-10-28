import type { TCategory } from "../types";

type CategoryRecord = Omit<TCategory, "createdAt" | "updatedAt"> & { createdAt: Date; updatedAt: Date };

export function serializeCategory(category: CategoryRecord): TCategory {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    description: category.description,
    aiSuggestions: category.aiSuggestions,
    userId: category.userId,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
