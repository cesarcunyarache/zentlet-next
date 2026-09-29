"use client";

import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";
import { useVoiceEntry } from "../../hooks/voice/useVoiceEntry";
import { hasFooterActions } from "../../lib/voice-entry";
import { VoiceEntryFooter } from "./voice-entry-footer";
import { VoiceErrorView } from "./voice-error-view";
import { VoiceListeningView } from "./voice-listening-view";
import { VoiceMicButton } from "./voice-mic-button";
import { VoicePreviewView } from "./voice-preview-view";

interface VoiceEntryProps {
  categories: CategoryLike[];
  currency: string;
  onSave: (values: TransactionFormValues) => void;
  onEdit: (draft: Partial<TransactionFormValues>) => void;
}

export function VoiceEntry({ categories, currency, onSave, onEdit }: VoiceEntryProps) {
  const t = useTranslations("transactions.voice");
  const voice = useVoiceEntry({ categories, onSave, onEdit });
  const { speech, stage, draft, values } = voice;

  function renderStage() {
    if (stage === "idle" || stage === "listening") {
      return (
        <VoiceListeningView
          key="listening"
          isReady={speech.status === "listening"}
          isSpeaking={speech.isSpeaking}
          transcript={speech.transcript}
        />
      );
    }
    if (stage === "preview" && draft && values) {
      return (
        <VoicePreviewView
          key="preview"
          transcript={speech.transcript}
          draft={draft}
          values={values}
          currency={currency}
          categories={categories}
          isAiSuggested={voice.isAiSuggested}
          onPickCategory={voice.pickCategory}
          onRetry={voice.retry}
        />
      );
    }
    if (stage === "error" && speech.error) return <VoiceErrorView key="error" error={speech.error} />;
    return null;
  }

  return (
    <>
      <VoiceMicButton label={t("title")} onPress={voice.open} />

      <Sheet
        isOpen={voice.isOpen}
        onOpenChange={(isNextOpen) => !isNextOpen && voice.close()}
        title={t("title")}
        hideTitle
        className="min-h-[62dvh]"
        bodyClassName="flex flex-col"
        footer={
          hasFooterActions(stage) ? (
            <VoiceEntryFooter
              stage={stage}
              error={speech.error}
              canSave={voice.canSave}
              onStop={speech.stop}
              onEdit={voice.edit}
              onSave={voice.save}
              onTypeInstead={voice.typeInstead}
              onRetry={voice.retry}
            />
          ) : null
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {renderStage()}
        </AnimatePresence>
      </Sheet>
    </>
  );
}
