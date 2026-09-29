"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { TypingAnimation } from "@/core/components/ui/typing-animation";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { Glow, Pop, SceneFrame, TRANSPORT } from "./scene-primitives";

const TYPING_DELAY_MS = 300;
const TYPING_SPEED_MS = 70;

const SPARKLE_ANIMATION = { rotate: [0, 18, -10, 0], scale: [1, 1.2, 1] };
const SPARKLE_TRANSITION = { duration: 1.6, repeat: Infinity, repeatDelay: 1.2 };

export function TypeScene() {
  const t = useTranslations("onboarding.steps.type");
  const reduceMotion = useReducedMotion();
  const phrase = t("phrase");

  return (
    <SceneFrame>
      <Glow className="-top-24 -right-20 bg-[color-mix(in_oklch,var(--app-expense)_22%,transparent)]" />
      <div className="relative w-[82%]">
        <div className="bg-app-bg flex min-h-14 items-center rounded-2xl px-4 shadow-[0_10px_30px_-18px_color-mix(in_oklch,var(--app-ink)_40%,transparent)] ring-1 ring-[var(--app-border)]">
          {reduceMotion ? (
            <span className="text-app-fg text-lg font-medium">{phrase}</span>
          ) : (
            <TypingAnimation
              startOnView={false}
              delay={TYPING_DELAY_MS}
              typeSpeed={TYPING_SPEED_MS}
              className="text-app-fg text-lg leading-normal font-medium tracking-normal"
            >
              {phrase}
            </TypingAnimation>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Pop delay={1.5} className="bg-app-expense-soft text-app-expense rounded-full px-3 py-1.5 text-[13px] font-semibold">
            {t("expense")}
          </Pop>
          <Pop delay={1.75} className="bg-app-fill text-app-fg flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[13px] font-semibold">
            <CategoryEmoji category={TRANSPORT} className="size-7 rounded-full text-sm" />
            {t("category")}
          </Pop>
        </div>

        <Pop delay={2.1} className="text-app-muted mt-4 flex items-center gap-1.5 text-xs font-medium">
          <motion.span
            animate={reduceMotion ? undefined : SPARKLE_ANIMATION}
            transition={SPARKLE_TRANSITION}
            className="text-app-expense inline-flex"
          >
            <Sparkles className="size-3.5" />
          </motion.span>
          {t("detected")}
        </Pop>
      </div>
    </SceneFrame>
  );
}
