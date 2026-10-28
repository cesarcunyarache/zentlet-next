"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { track } from "@/lib/observability/client";
import { buildFeedbackContext, canSendFeedback, type FeedbackDialogStatus } from "../lib/feedback-form";
import { feedbackService } from "../services/feedback.service";

const SUCCESS_DURATION_MS = 1600;
const FOCUS_DELAY_MS = 300;
const FEEDBACK_TYPE = "comment";

export function useFeedbackDialog(shouldReduceMotion: boolean) {
  const locale = useLocale();
  const { online: isOnline } = useSyncStatus();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<FeedbackDialogStatus>("idle");
  const [message, setMessage] = useState("");

  const isOpen = status !== "idle";
  const isSending = status === "sending";
  const canSend = canSendFeedback({ isOnline, isSending, message });

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const close = useCallback(() => {
    clearCloseTimer();
    setStatus("idle");
    setMessage("");
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  useEffect(() => {
    if (status !== "open") return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), shouldReduceMotion ? 0 : FOCUS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, shouldReduceMotion]);

  function open() {
    clearCloseTimer();
    setStatus("open");
  }

  function handleOpenChange(nextIsOpen: boolean) {
    if (!nextIsOpen && !isSending) close();
  }

  async function submit() {
    if (!canSend) return;
    setStatus("sending");
    try {
      await feedbackService.sendFeedback({
        message,
        type: FEEDBACK_TYPE,
        context: buildFeedbackContext({
          locale,
          path: window.location.pathname,
          userAgent: navigator.userAgent,
          isOnline: navigator.onLine,
        }),
      });
      track("feedback_sent", { type: FEEDBACK_TYPE });
      setStatus("sent");
      clearCloseTimer();
      closeTimerRef.current = setTimeout(close, SUCCESS_DURATION_MS);
    } catch {
      setStatus("error");
    }
  }

  return {
    status,
    message,
    setMessage,
    textareaRef,
    isOnline,
    isOpen,
    isSending,
    canSend,
    open,
    close,
    handleOpenChange,
    submit,
  };
}
