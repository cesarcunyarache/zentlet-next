import { FEEDBACK_CONTEXT_LIMITS, FEEDBACK_MAX_LENGTH } from "../constants";
import type { FeedbackContext } from "../schemas/feedback-api.schema";

export type FeedbackDialogStatus = "idle" | "open" | "sending" | "sent" | "error";

const COUNTER_VISIBLE_MARGIN = 200;

export const COUNTER_VISIBLE_FROM = FEEDBACK_MAX_LENGTH - COUNTER_VISIBLE_MARGIN;

interface SendState {
  isOnline: boolean;
  isSending: boolean;
  message: string;
}

interface ContextSource {
  locale: string;
  path: string;
  userAgent: string;
  isOnline: boolean;
}

interface ShortcutKeyEvent {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}

export function canSendFeedback({ isOnline, isSending, message }: SendState) {
  return isOnline && !isSending && message.trim().length > 0;
}

export function shouldShowCounterRow(messageLength: number, isOnline: boolean) {
  return messageLength >= COUNTER_VISIBLE_FROM || !isOnline;
}

export function remainingCharacters(messageLength: number) {
  return FEEDBACK_MAX_LENGTH - messageLength;
}

export function isSubmitShortcut({ key, metaKey, ctrlKey }: ShortcutKeyEvent) {
  return key === "Enter" && (metaKey || ctrlKey);
}

export function buildFeedbackContext({ locale, path, userAgent, isOnline }: ContextSource): FeedbackContext {
  return {
    locale,
    path,
    userAgent: userAgent.slice(0, FEEDBACK_CONTEXT_LIMITS.userAgent),
    online: isOnline,
  };
}

export type FeedbackView = "form" | "sent" | "error";

export function feedbackViewOf(status: FeedbackDialogStatus): FeedbackView {
  if (status === "sent") return "sent";
  if (status === "error") return "error";
  return "form";
}
