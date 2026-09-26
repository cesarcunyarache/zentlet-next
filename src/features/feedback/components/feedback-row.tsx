"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, MessageSquare, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertDialog } from "@heroui/react";
import { useLocale, useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { track } from "@/lib/observability/client";
import { FEEDBACK_MAX_LENGTH } from "../constants";
import { feedbackService } from "../services/feedback.service";

type Status = "idle" | "open" | "sending" | "sent" | "error";

const SUCCESS_DURATION_MS = 1600;
/** A partir de aquí se muestra cuánto queda. */
const COUNTER_FROM = FEEDBACK_MAX_LENGTH - 200;
/** El modal entra con animación: se enfoca el campo cuando ya está quieto. */
const FOCUS_DELAY_MS = 300;

// Destellos que salen del icono de éxito.
const SPRINKLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  return {
    x: Math.cos(angle) * 26,
    y: Math.sin(angle) * 26,
    color: i % 2 === 0 ? "var(--app-income)" : "var(--app-fg)",
  };
});

/**
 * Fila de Ajustes que abre un modal para enviar un comentario:
 * formulario → enviando → gracias (se cierra solo) o error con reintento,
 * sin perder lo escrito.
 */
export function FeedbackRow() {
  const t = useTranslations("settings.feedback");
  const locale = useLocale();
  const { online } = useSyncStatus();
  const reduce = useReducedMotion();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const open = status !== "idle";
  const busy = status === "sending";
  const canSend = online && !busy && message.trim().length > 0;

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

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (status !== "open") return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), reduce ? 0 : FOCUS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [status, reduce]);

  const submit = async () => {
    if (!canSend) return;
    setStatus("sending");
    try {
      await feedbackService.sendFeedback({
        message,
        type: "comment",
        context: {
          locale,
          path: window.location.pathname,
          userAgent: navigator.userAgent.slice(0, 400),
          online: navigator.onLine,
        },
      });
      track("feedback_sent", { type: "comment" });
      setStatus("sent");
      clearCloseTimer();
      closeTimerRef.current = setTimeout(close, SUCCESS_DURATION_MS);
    } catch {
      // lo escrito se conserva para poder reintentar
      setStatus("error");
    }
  };

  const viewInitial = reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" };
  const viewAnimate = reduce
    ? { opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } }
    : { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.24, ease: EASE_OUT } };
  const viewExit = reduce
    ? { opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }
    : { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.16, ease: EASE_OUT } };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          clearCloseTimer();
          setStatus("open");
        }}
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
        isOpen={open}
        onOpenChange={(next) => !next && !busy && close()}
        isDismissable={!busy}
        isKeyboardDismissDisabled={busy}
        // entrada y salida propias en globals.css (`.feedback-modal`)
        className="feedback-modal-backdrop bg-[var(--app-scrim)]"
      >
        <AlertDialog.Container placement="center" size="sm" className="feedback-modal">
          <AlertDialog.Dialog
            aria-label={t("title")}
            className="bg-app-surface text-app-fg overflow-hidden rounded-[28px] p-2 shadow-[var(--shadow-sheet)]"
          >
            {/* el alto sigue al contenido: al pasar de formulario a gracias o error no salta */}
            <motion.div layout={!reduce} transition={SPRING_LAYOUT}>
              <AnimatePresence mode="popLayout" initial={false}>
                {status === "sent" ? (
                  <motion.div key="sent" initial={viewInitial} animate={viewAnimate} exit={viewExit}>
                    <div
                      role="status"
                      className="bg-app-fill flex flex-col items-center justify-center gap-1.5 rounded-[22px] px-5 py-8 text-center"
                    >
                      <div className="relative mb-1 flex size-12 items-center justify-center">
                        {!reduce &&
                          SPRINKLES.map((sprinkle, i) => (
                            <motion.span
                              key={`${sprinkle.x}-${sprinkle.y}`}
                              initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
                              animate={{
                                opacity: [0, 1, 0],
                                scale: [0, 1, 0.4],
                                x: sprinkle.x,
                                y: sprinkle.y,
                              }}
                              transition={{ duration: 0.6, delay: 0.18 + i * 0.02, ease: "easeOut" }}
                              style={{ backgroundColor: sprinkle.color }}
                              className="absolute size-1.5 rounded-full"
                            />
                          ))}
                        <motion.div
                          initial={reduce ? { scale: 1 } : { scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.04 }}
                          className="bg-app-income flex size-12 items-center justify-center rounded-full"
                        >
                          <motion.svg viewBox="0 0 24 24" fill="none" className="text-app-surface size-5">
                            <motion.path
                              d="M5 12.5l4.5 4.5L19 7.5"
                              stroke="currentColor"
                              strokeWidth={2.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
                            />
                          </motion.svg>
                        </motion.div>
                      </div>
                      <h3 className="text-app-fg m-0 text-base font-semibold">{t("thanksTitle")}</h3>
                      <p className="text-app-muted m-0 text-sm leading-relaxed">{t("thanksBody")}</p>
                    </div>
                  </motion.div>
                ) : status === "error" ? (
                  <motion.div key="error" initial={viewInitial} animate={viewAnimate} exit={viewExit}>
                    <div role="alert" className="bg-app-fill rounded-[22px] px-5 py-6 text-center">
                      <div className="bg-app-expense-soft text-app-expense mx-auto flex size-12 items-center justify-center rounded-full">
                        <AlertCircle className="size-5" aria-hidden />
                      </div>
                      <h3 className="text-app-fg mt-3 mb-0 text-base font-semibold">{t("errorTitle")}</h3>
                      <p className="text-app-muted mt-1 mb-0 text-sm leading-relaxed">
                        {t(online ? "errorBody" : "offline")}
                      </p>
                    </div>
                    <div className="flex gap-2 px-1 pt-2 pb-1">
                      <button
                        type="button"
                        onClick={close}
                        className="bg-app-fill text-app-muted hover:text-app-fg min-h-12 flex-1 rounded-2xl text-sm font-semibold transition-colors"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={submit}
                        disabled={!canSend}
                        className="bg-app-fg text-app-surface min-h-12 flex-1 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
                      >
                        {t("retry")}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={viewInitial} animate={viewAnimate} exit={viewExit}>
                    <div className="bg-app-fill min-h-[168px] rounded-[22px] px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-app-fg m-0 text-base font-semibold">{t("title")}</h3>
                        <button
                          type="button"
                          onClick={close}
                          disabled={busy}
                          aria-label={t("close")}
                          className="bg-app-surface text-app-muted hover:text-app-fg flex size-7 shrink-0 items-center justify-center rounded-full transition-colors"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={(event) => {
                          // ⌘/Ctrl + Enter envía, como en cualquier caja de mensajes
                          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit();
                        }}
                        placeholder={t("placeholder")}
                        aria-label={t("title")}
                        maxLength={FEEDBACK_MAX_LENGTH}
                        disabled={busy}
                        rows={4}
                        className="text-app-fg placeholder:text-app-muted/60 mt-2 w-full resize-none border-0 bg-transparent text-base leading-relaxed outline-none"
                      />
                      {(message.length >= COUNTER_FROM || !online) && (
                        <p className="text-app-muted m-0 text-right text-[11px]">
                          {online
                            ? t("remaining", { count: FEEDBACK_MAX_LENGTH - message.length })
                            : t("offline")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                      <button
                        type="button"
                        onClick={close}
                        disabled={busy}
                        className="bg-app-fill text-app-muted hover:text-app-fg min-h-12 flex-1 rounded-2xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={submit}
                        disabled={!canSend}
                        aria-busy={busy}
                        className="bg-app-fg text-app-surface inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-50"
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={busy ? "sending" : "send"}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.16, ease: EASE_OUT }}
                            className="inline-flex items-center gap-2"
                          >
                            {busy && <RefreshCw className="size-3.5 animate-spin" aria-hidden />}
                            {t(busy ? "sending" : "send")}
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
