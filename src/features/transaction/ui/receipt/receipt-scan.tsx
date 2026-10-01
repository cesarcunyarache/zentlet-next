"use client";

import { AnimatePresence } from "motion/react";
import { ScanLine, Smartphone, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";
import { useReceiptScan } from "../../hooks/receipt/useReceiptScan";
import { VoiceEntryFooter } from "../voice/voice-entry-footer";
import { VoicePreviewView } from "../voice/voice-preview-view";
import { ReceiptCameraButton } from "./receipt-camera-button";
import { ReceiptErrorView } from "./receipt-error-view";
import { ReceiptScanningView } from "./receipt-scanning-view";

const SCAN_ICON = <ScanLine className="size-4" strokeWidth={2} />;
const SPARKLES_ICON = <Sparkles aria-hidden className="size-3.5" strokeWidth={2.2} />;
const DEVICE_ICON = <Smartphone aria-hidden className="size-3.5" strokeWidth={2.2} />;

interface ReceiptScanProps {
  categories: CategoryLike[];
  currency: string;
  onSave: (values: TransactionFormValues) => void;
  onEdit: (draft: Partial<TransactionFormValues>) => void;
}

export function ReceiptScan({ categories, currency, onSave, onEdit }: ReceiptScanProps) {
  const t = useTranslations("transactions.receipt");
  const receipt = useReceiptScan({ categories, currency, onSave, onEdit });
  const { stage, draft, values } = receipt;
  const canRetry = receipt.error !== "not_receipt" && receipt.error !== "invalid_image";

  function renderStage() {
    if (stage === "scanning") return <ReceiptScanningView key="scanning" previewUrl={receipt.previewUrl} step={receipt.step} />;
    if (stage === "preview" && draft && values) {
      return (
        <div key="preview" className="flex flex-col">
          {receipt.method ? (
            <p className="text-app-muted m-0 mt-5 flex items-center gap-1.5 text-xs font-semibold">
              {receipt.method === "ai" ? SPARKLES_ICON : DEVICE_ICON}
              {t(`method.${receipt.method}`)}
            </p>
          ) : null}
          {receipt.isForeignCurrency ? (
            <p role="note" className="bg-app-expense-soft text-app-expense m-0 mt-5 rounded-2xl px-4 py-3 text-sm font-semibold">
              {t("foreignCurrency", { currency: receipt.detectedCurrency ?? "" })}
            </p>
          ) : null}
          <VoicePreviewView
            transcript={receipt.summary}
            draft={draft}
            values={values}
            currency={currency}
            categories={categories}
            isAiSuggested={receipt.isAiSuggested}
            onPickCategory={receipt.pickCategory}
            onRetry={receipt.retry}
            redoLabel={t("redo")}
            redoIcon={SCAN_ICON}
            noAmountLabel={t("noAmount")}
          />
        </div>
      );
    }
    if (stage === "error" && receipt.error) return <ReceiptErrorView key="error" error={receipt.error} />;
    return null;
  }

  return (
    <>
      <ReceiptCameraButton label={t("title")} onPick={receipt.pickFile} />

      <Sheet
        isOpen={receipt.isOpen}
        onOpenChange={(isNextOpen) => !isNextOpen && receipt.close()}
        title={t("title")}
        hideTitle
        className="min-h-[62dvh]"
        bodyClassName="flex flex-col"
        footer={
          stage === "scanning" ? null : (
            <VoiceEntryFooter
              stage={stage}
              error={null}
              canRetry={canRetry}
              canSave={receipt.canSave}
              onStop={receipt.close}
              onEdit={receipt.edit}
              onSave={receipt.save}
              onTypeInstead={receipt.typeInstead}
              onRetry={receipt.retry}
            />
          )
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {renderStage()}
        </AnimatePresence>
      </Sheet>
    </>
  );
}
