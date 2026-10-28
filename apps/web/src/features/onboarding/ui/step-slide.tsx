"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from "motion/react";
import { useTranslations } from "next-intl";
import { EASE_OUT } from "@/lib/ease";
import type { OnboardingStep, StepDirection } from "../lib/steps";
import { BudgetScene } from "./scenes/budget-scene";
import { MonthScene } from "./scenes/month-scene";
import { TypeScene } from "./scenes/type-scene";
import { VoiceScene } from "./scenes/voice-scene";

interface StepSlideProps {
  step: OnboardingStep;
  direction: StepDirection;
  currency: string;
  createsCategory: boolean;
  onDragEnd: (event: unknown, info: PanInfo) => void;
}

interface StepSceneProps {
  step: OnboardingStep;
  currency: string;
}

const SLIDE_DISTANCE = 56;

const SLIDE: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: SLIDE_DISTANCE * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: -SLIDE_DISTANCE * direction }),
};

const FADE: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0 },
};

const SLIDE_TRANSITION = { duration: 0.35, ease: EASE_OUT };
const DRAG_CONSTRAINTS = { left: 0, right: 0 };
const DRAG_ELASTIC = 0.2;

export function StepSlide({ step, direction, currency, createsCategory, onDragEnd }: StepSlideProps) {
  const t = useTranslations("onboarding");
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={step}
        custom={direction}
        variants={reduceMotion ? FADE : SLIDE}
        initial="enter"
        animate="center"
        exit="exit"
        transition={SLIDE_TRANSITION}
        drag={reduceMotion ? false : "x"}
        dragConstraints={DRAG_CONSTRAINTS}
        dragElastic={DRAG_ELASTIC}
        onDragEnd={onDragEnd}
        className="flex flex-1 cursor-grab flex-col justify-center active:cursor-grabbing"
      >
        <StepScene step={step} currency={currency} />

        <div className="mt-8 px-1">
          <h2 id="onboarding-title" className="font-display m-0 text-[28px] leading-tight font-bold tracking-[-0.03em]">
            {t(`steps.${step}.title`)}
          </h2>
          <p id="onboarding-body" className="text-app-muted m-0 mt-3 text-[15px] leading-relaxed">
            {createsCategory ? t("steps.month.bodyNoCategories") : t(`steps.${step}.body`)}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function StepScene({ step, currency }: StepSceneProps) {
  switch (step) {
    case "type":
      return <TypeScene />;
    case "voice":
      return <VoiceScene currency={currency} />;
    case "budget":
      return <BudgetScene currency={currency} />;
    case "month":
      return <MonthScene currency={currency} />;
  }
}
