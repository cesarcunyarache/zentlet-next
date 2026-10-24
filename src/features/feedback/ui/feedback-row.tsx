"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertDialog } from "@heroui/react";
import { useTranslations } from "next-intl";
import { SettingsButtonRow } from "@/features/account/ui/settings-row";
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
      <SettingsButtonRow
        label={t("label")}
        hint={t("hint")}
        onClick={dialog.open}
        hasPopup
      />

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
