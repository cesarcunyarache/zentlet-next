"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import type { OnboardingStep } from "../lib/steps";

export type PrimaryAction = "next" | "start" | "create";

interface OnboardingFooterProps {
  step: OnboardingStep;
  canGoBack: boolean;
  primaryAction: PrimaryAction;
  onBack: () => void;
  onPrimary: () => void;
}

const PRIMARY_LABEL_KEYS = {
  next: "next",
  start: "start",
  create: "createCategory",
} as const satisfies Record<PrimaryAction, string>;

const BACK_HIDDEN = { opacity: 0, scale: 0.8 };
const BACK_VISIBLE = { opacity: 1, scale: 1 };
const BACK_TAP = { scale: 0.92 };
const PRIMARY_TAP = { scale: 0.97 };
const LABEL_INITIAL = { opacity: 0, y: 6 };
const LABEL_ANIMATE = { opacity: 1, y: 0 };
const LABEL_EXIT = { opacity: 0, y: -6 };
const LABEL_TRANSITION = { duration: 0.18 };

export function OnboardingFooter({ step, canGoBack, primaryAction, onBack, onPrimary }: OnboardingFooterProps) {
  const t = useTranslations("onboarding");
  const primary = useRef<HTMLButtonElement>(null);
  const isNext = primaryAction === "next";

  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, [step]);

  return (
    <footer className="mt-8 flex items-center gap-3">
      <AnimatePresence initial={false}>
        {canGoBack && (
          <motion.button
            type="button"
            aria-label={t("back")}
            onClick={onBack}
            initial={BACK_HIDDEN}
            animate={BACK_VISIBLE}
            exit={BACK_HIDDEN}
            whileTap={BACK_TAP}
            transition={SPRING_PRESS}
            className="bg-app-fill text-app-fg hover:bg-app-fill-strong grid size-14 shrink-0 place-items-center rounded-2xl transition-colors"
          >
            <ArrowLeft className="size-5" strokeWidth={2.2} />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        ref={primary}
        type="button"
        layout
        onClick={onPrimary}
        whileTap={PRIMARY_TAP}
        transition={SPRING_LAYOUT}
        className="bg-app-fg text-app-bg flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-[0_14px_28px_-12px_color-mix(in_oklch,var(--app-fg)_55%,transparent)]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={primaryAction}
            initial={LABEL_INITIAL}
            animate={LABEL_ANIMATE}
            exit={LABEL_EXIT}
            transition={LABEL_TRANSITION}
            className="flex items-center gap-2"
          >
            {t(PRIMARY_LABEL_KEYS[primaryAction])}
            {isNext && <ArrowRight className="size-4" strokeWidth={2.4} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </footer>
  );
}
