import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { CategoryLike } from "../../types";
import { findCreatedCategory } from "../../lib/transaction-form";

export function useCategoryCreation(categories: CategoryLike[], onCreated: (category: CategoryLike) => void) {
  const [isCreating, setIsCreating] = useState(false);
  const knownCategoryIds = useRef<Set<string> | null>(null);

  const selectCreated = useEffectEvent(onCreated);

  useEffect(() => {
    const knownIds = knownCategoryIds.current;
    if (!knownIds) return;
    const created = findCreatedCategory(categories, knownIds);
    if (!created) return;
    knownCategoryIds.current = null;
    selectCreated(created);
  }, [categories]);

  function startCreating() {
    knownCategoryIds.current = new Set(categories.map((category) => category.id));
    setIsCreating(true);
  }

  function stopCreating() {
    setIsCreating(false);
  }

  return { isCreating, startCreating, stopCreating };
}
