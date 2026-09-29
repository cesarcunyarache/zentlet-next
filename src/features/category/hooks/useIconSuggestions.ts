import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { generateCategory } from "../ai/actions/category-generator";
import type { CategoryIcon } from "../ai/schemas/category-ai.schema";
import { useCategoryStore } from "../stores/category.store";
import type { EditableCategory } from "../types";

const SUGGESTION_DELAY_MS = 700;

const FALLBACK_ICONS: CategoryIcon[] = [
  { icon: "🏷️", color: "#E9E4F5" },
  { icon: "🛒", color: "#FDECC8" },
  { icon: "🍽️", color: "#FBDDD5" },
  { icon: "🚌", color: "#D6E8F7" },
  { icon: "🏠", color: "#E4DDF3" },
  { icon: "💡", color: "#FFF1B8" },
  { icon: "🎉", color: "#F8D9EA" },
  { icon: "💼", color: "#D5F0DD" },
];

async function fetchAiIcons(name: string): Promise<CategoryIcon[] | null> {
  if (!navigator.onLine) return null;
  try {
    return (await generateCategory(name))?.categories ?? null;
  } catch {
    return null;
  }
}

function withCurrentFirst(icons: CategoryIcon[], current: CategoryIcon | null) {
  return current ? [current, ...icons.filter((item) => item.icon !== current.icon)] : icons;
}

interface IconSuggestionsOptions {
  name: string;
  category?: EditableCategory;
  onIconsChange: (icons: CategoryIcon[]) => void;
}

export function useIconSuggestions({ name, category, onIconsChange }: IconSuggestionsOptions) {
  const { categories } = useCategoryStore();
  const [debouncedName] = useDebounce(name, SUGGESTION_DELAY_MS);

  const current = category?.icon ? { icon: category.icon, color: category.color || "" } : null;
  const saved = category ? (categories.find((item) => item.id === category.id)?.aiSuggestions ?? []) : [];

  const [icons, setIcons] = useState(() => withCurrentFirst(saved, current));
  const [aiSuggestions, setAiSuggestions] = useState<CategoryIcon[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiUnavailable, setIsAiUnavailable] = useState(false);

  function showIcons(next: CategoryIcon[]) {
    setIcons(next);
    onIconsChange(next);
  }

  useEffect(() => {
    if (!debouncedName.trim()) return;
    if (category && debouncedName === category.name) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiSuggestions(undefined);
      showIcons(withCurrentFirst(saved, current));
      return;
    }
    let cancelled = false;

    async function suggest() {
      try {
        setIsLoading(true);
        const fromAi = await fetchAiIcons(debouncedName);
        if (cancelled) return;
        setIsAiUnavailable(!fromAi);
        setAiSuggestions(fromAi ?? undefined);
        showIcons(withCurrentFirst(fromAi ?? FALLBACK_ICONS, current));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    suggest();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName]);

  return { icons, aiSuggestions, isLoading, isAiUnavailable };
}
