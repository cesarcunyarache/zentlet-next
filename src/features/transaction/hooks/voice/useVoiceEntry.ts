import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { track } from "@/lib/observability/client";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { parseVoiceEntry } from "../../lib/parse-voice";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";
import { useAiCategoryPick } from "./useAiCategoryPick";
import {
  canSaveVoiceEntry,
  isAiSuggestedCategory,
  resolveVoiceCategory,
  toEditDraft,
  toFormValues,
  voiceStage,
  type TranscriptCategory,
} from "../../lib/voice-entry";

interface UseVoiceEntryOptions {
  categories: CategoryLike[];
  onSave: (values: TransactionFormValues) => void;
  onEdit: (draft: Partial<TransactionFormValues>) => void;
}

export function useVoiceEntry({ categories, onSave, onEdit }: UseVoiceEntryOptions) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const speech = useSpeechRecognition(locale);
  const [isOpen, setIsOpen] = useState(false);
  const [manualPick, setManualPick] = useState<TranscriptCategory | null>(null);

  const parsed = useMemo(
    () => (speech.status === "done" ? parseVoiceEntry(speech.transcript, categories, locale) : null),
    [speech.status, speech.transcript, categories, locale],
  );
  const aiPick = useAiCategoryPick({ parsed, transcript: speech.transcript, categories });
  const resolution = resolveVoiceCategory({ parsed, transcript: speech.transcript, manualPick, aiPick });
  const { draft, manualCategoryId } = resolution;
  const values = draft && toFormValues(draft, categories, t("transactions.defaultDescription"));
  const canSave = canSaveVoiceEntry(values);

  useEffect(() => {
    if (speech.status === "error" && speech.error) track("voice_entry_failed", { reason: speech.error });
  }, [speech.status, speech.error]);

  function open() {
    setIsOpen(true);
    speech.start();
    track("voice_entry_started", {});
  }

  function close() {
    speech.cancel();
    setIsOpen(false);
  }

  function save() {
    if (!values || !canSave) return;
    onSave(values);
    setIsOpen(false);
    track("voice_entry_completed", { outcome: "saved" });
    track("transaction_created", { source: "voice", type: values.type, category_auto: !manualCategoryId });
  }

  function edit() {
    if (!draft) return;
    setIsOpen(false);
    track("voice_entry_completed", { outcome: "edited" });
    onEdit(toEditDraft(draft));
  }

  function retry() {
    speech.start();
  }

  function typeInstead() {
    close();
    onEdit({});
  }

  function pickCategory(categoryId: string) {
    setManualPick({ transcript: speech.transcript, categoryId });
  }

  return {
    isOpen,
    stage: voiceStage(speech.status, draft !== null),
    speech,
    draft,
    values,
    canSave,
    isAiSuggested: isAiSuggestedCategory(resolution),
    open,
    close,
    retry,
    save,
    edit,
    typeInstead,
    pickCategory,
  };
}
