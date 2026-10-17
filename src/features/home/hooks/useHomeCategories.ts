import { useMemo } from "react";
import { useCategoryStore } from "@/features/category/stores/category.store";
import type { CategoryLike } from "@/features/transaction/types";

export function useHomeCategories() {
  const { categories: storedCategories } = useCategoryStore();

  const categories = useMemo<CategoryLike[]>(() => {
    if (!Array.isArray(storedCategories)) return [];
    return storedCategories.map(({ id, name, icon, color }: CategoryLike) => ({ id, name, icon, color }));
  }, [storedCategories]);

  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  return { categories, categoriesById };
}
