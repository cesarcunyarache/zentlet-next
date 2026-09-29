import { useEffect, useEffectEvent, useState } from "react";
import { suggestTransactionCategory } from "../../ai/actions/category-suggester";
import type { VoiceDraft } from "../../lib/parse-voice";
import type { CategoryLike } from "../../types";
import { needsAiCategory, type TranscriptCategory } from "../../lib/voice-entry";

interface UseAiCategoryPickOptions {
  parsed: VoiceDraft | null;
  transcript: string;
  categories: CategoryLike[];
}

export function useAiCategoryPick({ parsed, transcript, categories }: UseAiCategoryPickOptions) {
  const [aiPick, setAiPick] = useState<TranscriptCategory | null>(null);
  const shouldAskAi = needsAiCategory(parsed);

  const requestSuggestion = useEffectEvent(() =>
    suggestTransactionCategory({
      description: parsed?.description ?? "",
      categories: categories.map(({ id, name }) => ({ id, name })),
    }),
  );

  useEffect(() => {
    if (!shouldAskAi || !navigator.onLine) return;
    let isCancelled = false;
    requestSuggestion()
      .then((result) => {
        if (!isCancelled && result?.categoryId) setAiPick({ transcript, categoryId: result.categoryId });
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [shouldAskAi, transcript]);

  return aiPick;
}
