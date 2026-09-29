"use client";

import type { KeyboardEvent, RefObject } from "react";
import { RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { FEEDBACK_MAX_LENGTH } from "../constants";
import { isSubmitShortcut, remainingCharacters, shouldShowCounterRow } from "../lib/feedback-form";
import { SEND_LABEL_MOTION } from "./feedback-motion";

interface FeedbackFormViewProps {
  message: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isOnline: boolean;
  isSending: boolean;
  canSend: boolean;
  onMessageChange: (message: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function FeedbackFormView({
  message,
  textareaRef,
  isOnline,
  isSending,
  canSend,
  onMessageChange,
  onClose,
  onSubmit,
}: FeedbackFormViewProps) {
  const t = useTranslations("settings.feedback");

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isSubmitShortcut(event)) onSubmit();
  }

  return (
    <>
      <div className="bg-app-fill min-h-[168px] rounded-[22px] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-app-fg m-0 text-base font-semibold">{t("title")}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            aria-label={t("close")}
            className="bg-app-surface text-app-muted hover:text-app-fg flex size-7 shrink-0 items-center justify-center rounded-full transition-colors"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("placeholder")}
          aria-label={t("title")}
          maxLength={FEEDBACK_MAX_LENGTH}
          disabled={isSending}
          rows={4}
          className="text-app-fg placeholder:text-app-muted/60 mt-2 w-full resize-none border-0 bg-transparent text-base leading-relaxed outline-none"
        />
        {shouldShowCounterRow(message.length, isOnline) && (
          <p className="text-app-muted m-0 text-right text-[11px]">
            {isOnline ? t("remaining", { count: remainingCharacters(message.length) }) : t("offline")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 px-1 pt-2 pb-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isSending}
          className="bg-app-fill text-app-muted hover:text-app-fg min-h-12 flex-1 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSend}
          aria-busy={isSending}
          className="bg-app-fg text-app-surface inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={isSending ? "sending" : "send"}
              {...SEND_LABEL_MOTION}
              className="inline-flex items-center gap-2"
            >
              {isSending && <RefreshCw className="size-3.5 animate-spin" aria-hidden />}
              {t(isSending ? "sending" : "send")}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </>
  );
}
