"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface FeedbackErrorViewProps {
  isOnline: boolean;
  canSend: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export function FeedbackErrorView({ isOnline, canSend, onClose, onRetry }: FeedbackErrorViewProps) {
  const t = useTranslations("settings.feedback");

  return (
    <>
      <div role="alert" className="bg-app-fill rounded-[22px] px-5 py-6 text-center">
        <div className="bg-app-expense-soft text-app-expense mx-auto flex size-12 items-center justify-center rounded-full">
          <AlertCircle className="size-5" aria-hidden />
        </div>
        <h3 className="text-app-fg mt-3 mb-0 text-base font-semibold">{t("errorTitle")}</h3>
        <p className="text-app-muted mt-1 mb-0 text-sm leading-relaxed">{t(isOnline ? "errorBody" : "offline")}</p>
      </div>
      <div className="flex gap-2 px-1 pt-2 pb-1">
        <button
          type="button"
          onClick={onClose}
          className="bg-app-fill text-app-muted hover:text-app-fg min-h-12 flex-1 rounded-2xl text-sm font-semibold transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={!canSend}
          className="bg-app-fg text-app-surface min-h-12 flex-1 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
        >
          {t("retry")}
        </button>
      </div>
    </>
  );
}
