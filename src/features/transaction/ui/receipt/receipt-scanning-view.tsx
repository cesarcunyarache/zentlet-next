"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReceiptStep } from "../../lib/receipt/read-receipt";
import { VOICE_VIEW_MOTION } from "../voice/voice-view-motion";

interface ReceiptScanningViewProps {
  previewUrl: string | null;
  step: ReceiptStep;
}

export function ReceiptScanningView({ previewUrl, step }: ReceiptScanningViewProps) {
  const t = useTranslations("transactions.receipt");
  const shouldReduceMotion = Boolean(useReducedMotion());

  return (
    <motion.div {...VOICE_VIEW_MOTION} className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
      <div className="bg-app-fill relative h-64 w-48 overflow-hidden rounded-3xl ring-1 ring-[var(--app-border)]">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover opacity-80" />
        ) : null}
        {shouldReduceMotion ? null : (
          <motion.span
            aria-hidden
            className="bg-app-expense absolute inset-x-0 h-1 shadow-[0_0_18px_4px_var(--app-expense)]"
            initial={{ top: "0%" }}
            animate={{ top: ["0%", "98%", "0%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p role="status" aria-live="polite" className="font-display text-app-fg m-0 text-xl font-bold tracking-[-0.02em]">
          {t("reading")}
        </p>
        <p className="text-app-muted m-0 text-sm">{t(`steps.${step}`)}</p>
      </div>
    </motion.div>
  );
}
