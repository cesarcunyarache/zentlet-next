import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import { suggestTransactionCategory } from "../../ai/actions/category-suggester";
import { toPromptCategories } from "../../ai/prompts/prompt-categories";
import type { TransactionSuggestion } from "../../ai/schemas/transaction-ai.schema";
import type { CategoryLike } from "../../types";
import { MIN_SUGGESTION_LENGTH, normalizeSuggestionText } from "../../lib/transaction-form";

const SUGGESTION_DEBOUNCE_MS = 550;

interface UseCategorySuggestionOptions {
  description: string;
  isEnabled: boolean;
  categories: CategoryLike[];
  onSuggestion: (suggestion: TransactionSuggestion) => void;
}

export function useCategorySuggestion({
  description,
  isEnabled,
  categories,
  onSuggestion,
}: UseCategorySuggestionOptions) {
  const [debouncedDescription] = useDebounce(description, SUGGESTION_DEBOUNCE_MS);
  const [isThinking, setIsThinking] = useState(false);
  const cache = useRef(new Map<string, TransactionSuggestion | null>());

  const applySuggestion = useEffectEvent((suggestion: TransactionSuggestion | null) => {
    if (suggestion) onSuggestion(suggestion);
  });

  useEffect(() => {
    const text = normalizeSuggestionText(debouncedDescription);
    if (!isEnabled || text.length < MIN_SUGGESTION_LENGTH || !categories.length) return;
    let isCancelled = false;

    async function requestSuggestion() {
      if (cache.current.has(text)) {
        applySuggestion(cache.current.get(text) ?? null);
        return;
      }
      setIsThinking(true);
      try {
        const suggestion = await suggestTransactionCategory({
          description: text,
          categories: toPromptCategories(categories),
        });
        cache.current.set(text, suggestion);
        if (!isCancelled) applySuggestion(suggestion);
      } catch {
        return;
      } finally {
        if (!isCancelled) setIsThinking(false);
      }
    }

    requestSuggestion();
    return () => {
      isCancelled = true;
      setIsThinking(false);
    };
  }, [debouncedDescription, isEnabled, categories]);

  return isThinking;
}
