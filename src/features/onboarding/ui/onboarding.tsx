"use client";

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/observability/client";
import { EASE_OUT } from "@/lib/ease";
import { useOnboarding } from "../hooks/useOnboarding";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useOnboardingSteps } from "../hooks/useOnboardingSteps";
import { completionTarget, keyboardIntent, swipeStepDelta } from "../lib/steps";
import { OnboardingFooter, type PrimaryAction } from "./onboarding-footer";
import { StepProgress } from "./step-progress";
import { StepSlide } from "./step-slide";

interface OnboardingProps {
  currency: string;
  hasCategories: boolean;
  onCreateCategory: () => void;
}

const BACKDROP_HIDDEN = { opacity: 0 };
const BACKDROP_VISIBLE = { opacity: 1 };
const BACKDROP_EXIT = { opacity: 0, transition: { duration: 0.25 } };

const PANEL_HIDDEN = { opacity: 0, y: 24, scale: 0.98 };
const PANEL_VISIBLE = { opacity: 1, y: 0, scale: 1 };
const PANEL_EXIT = { opacity: 0, y: 12, scale: 0.98 };
const PANEL_TRANSITION = { duration: 0.5, ease: EASE_OUT };

function primaryActionFor(isLast: boolean, createsCategory: boolean): PrimaryAction {
  if (!isLast) return "next";
  return createsCategory ? "create" : "start";
}

export function Onboarding(props: OnboardingProps) {
  const { open } = useOnboarding();
  return <AnimatePresence>{open && <OnboardingDialog {...props} />}</AnimatePresence>;
}

function OnboardingDialog({ currency, hasCategories, onCreateCategory }: OnboardingProps) {
  const t = useTranslations("onboarding");
  const { finish } = useOnboarding();
  const reduceMotion = useReducedMotion();
  const { step, stepIndex, direction, isFirst, isLast, goNext, goBack } = useOnboardingSteps();
  const createsCategory = isLast && !hasCategories;

  useBodyScrollLock();

  function close(skipped: boolean) {
    const next = completionTarget(createsCategory, skipped);
    track("onboarding_completed", { skipped, step: stepIndex + 1, next });
    finish();
    if (next === "categories") onCreateCategory();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const intent = keyboardIntent(event.key);
    if (intent === "next") goNext();
    else if (intent === "back") goBack();
    else if (intent === "skip") close(true);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const delta = swipeStepDelta(info);
    if (delta === 1) goNext();
    else if (delta === -1) goBack();
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
      onKeyDown={onKeyDown}
      initial={BACKDROP_HIDDEN}
      animate={BACKDROP_VISIBLE}
      exit={BACKDROP_EXIT}
      className="bg-app-bg text-app-fg fixed inset-0 z-[60] flex flex-col"
    >
      <motion.div
        initial={reduceMotion ? false : PANEL_HIDDEN}
        animate={PANEL_VISIBLE}
        exit={reduceMotion ? undefined : PANEL_EXIT}
        transition={PANEL_TRANSITION}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))] sm:px-6"
      >
        <header className="flex h-11 items-center justify-between">
          <span className="sr-only">{t("label")}</span>
          <StepProgress stepIndex={stepIndex} />
          {!isLast && (
            <button
              type="button"
              onClick={() => close(true)}
              className="text-app-muted hover:text-app-fg min-h-11 rounded-full px-3 text-sm font-semibold transition-colors"
            >
              {t("skip")}
            </button>
          )}
        </header>

        <div className="relative mt-6 flex flex-1 flex-col">
          <StepSlide
            step={step}
            direction={direction}
            currency={currency}
            createsCategory={createsCategory}
            onDragEnd={onDragEnd}
          />
        </div>

        <OnboardingFooter
          step={step}
          canGoBack={!isFirst}
          primaryAction={primaryActionFor(isLast, createsCategory)}
          onBack={goBack}
          onPrimary={() => (isLast ? close(false) : goNext())}
        />
      </motion.div>
    </motion.div>
  );
}
