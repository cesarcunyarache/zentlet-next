"use client";

import { MessageSquare } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertDialog } from "@heroui/react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT } from "@/lib/ease";
import { useFeedbackDialog } from "../hooks/useFeedbackDialog";
import { feedbackViewOf } from "../lib/feedback-form";
import { FeedbackErrorView } from "./feedback-error-view";
import { FeedbackFormView } from "./feedback-form-view";
import { FULL_VIEW_MOTION, REDUCED_VIEW_MOTION } from "./feedback-motion";
import { FeedbackSentView } from "./feedback-sent-view";

export function FeedbackRow() {
  const t = useTranslations("settings.feedback");
  const shouldReduceMotion = useReducedMotion() ?? false;
  const dialog = useFeedbackDialog(shouldReduceMotion);
  const view = feedbackViewOf(dialog.status);
  const viewMotion = shouldReduceMotion ? REDUCED_VIEW_MOTION : FULL_VIEW_MOTION;

  return (
    <>
      <button
        type="button"
        onClick={dialog.open}
        aria-haspopup="dialog"
        className="border-app-border flex w-full items-center justify-between gap-3.5 border-b py-3.5 text-left"
      >
        <span>
          <span className="text-app-fg block text-[14.5px] font-semibold">{t("label")}</span>
          <span className="text-app-muted mt-px block text-xs">{t("hint")}</span>
        </span>
        <MessageSquare className="text-app-muted size-4 shrink-0" aria-hidden />
      </button>

      <AlertDialog.Backdrop
        isOpen={dialog.isOpen}
        onOpenChange={dialog.handleOpenChange}
        isDismissable={!dialog.isSending}
        isKeyboardDismissDisabled={dialog.isSending}
        className="feedback-modal-backdrop bg-[var(--app-scrim)]"
      >
        <AlertDialog.Container placement="center" size="sm" className="feedback-modal">
          <AlertDialog.Dialog
            aria-label={t("title")}
            className="bg-app-surface text-app-fg overflow-hidden rounded-[28px] p-2 shadow-[var(--shadow-sheet)]"
          >
            <motion.div layout={!shouldReduceMotion} transition={SPRING_LAYOUT}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={view} {...viewMotion}>
                  {view === "sent" && <FeedbackSentView shouldReduceMotion={shouldReduceMotion} />}
                  {view === "error" && (
                    <FeedbackErrorView
                      isOnline={dialog.isOnline}
                      canSend={dialog.canSend}
                      onClose={dialog.close}
                      onRetry={dialog.submit}
                    />
                  )}
                  {view === "form" && (
                    <FeedbackFormView
                      message={dialog.message}
                      textareaRef={dialog.textareaRef}
                      isOnline={dialog.isOnline}
                      isSending={dialog.isSending}
                      canSend={dialog.canSend}
                      onMessageChange={dialog.setMessage}
                      onClose={dialog.close}
                      onSubmit={dialog.submit}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
