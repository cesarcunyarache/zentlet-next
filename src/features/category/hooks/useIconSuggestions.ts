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

interface AiResult {
  name: string;
  icons: CategoryIcon[] | null;
}

export function useIconSuggestions({ name, category, onIconsChange }: IconSuggestionsOptions) {
  const { categories } = useCategoryStore();
  const [debouncedName] = useDebounce(name, SUGGESTION_DELAY_MS);
  const [lastResult, setLastResult] = useState<AiResult | null>(null);

  const current = category?.icon ? { icon: category.icon, color: category.color || "" } : null;
  const saved = category ? (categories.find((item) => item.id === category.id)?.aiSuggestions ?? []) : [];

  const isOriginalName = category !== undefined && debouncedName === category.name;
  const needsAi = debouncedName.trim() !== "" && !isOriginalName;
  const result = needsAi && lastResult?.name === debouncedName ? lastResult : null;

  const icons = withCurrentFirst(
    isOriginalName || !lastResult ? saved : (lastResult.icons ?? FALLBACK_ICONS),
    current,
  );

  useEffect(() => {
    if (isOriginalName) {
      onIconsChange(withCurrentFirst(saved, current));
      return;
    }
    if (!needsAi) return;
    let cancelled = false;

    fetchAiIcons(debouncedName).then((fromAi) => {
      if (cancelled) return;
      setLastResult({ name: debouncedName, icons: fromAi });
      onIconsChange(withCurrentFirst(fromAi ?? FALLBACK_ICONS, current));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName]);

  return {
    icons,
    aiSuggestions: result?.icons ?? undefined,
    isLoading: needsAi && !result,
    isAiUnavailable: result !== null && result.icons === null,
  };
}
