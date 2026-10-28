"use client";

import { useState } from "react";
import { LAST_STEP_INDEX, ONBOARDING_STEPS, isValidStepIndex, type StepDirection } from "../lib/steps";

export function useOnboardingSteps() {
  const [[stepIndex, direction], setStep] = useState<[number, StepDirection]>([0, 1]);

  function goTo(next: number) {
    if (!isValidStepIndex(next)) return;
    setStep([next, next > stepIndex ? 1 : -1]);
  }

  return {
    step: ONBOARDING_STEPS[stepIndex],
    stepIndex,
    direction,
    isFirst: stepIndex === 0,
    isLast: stepIndex === LAST_STEP_INDEX,
    goNext: () => goTo(stepIndex + 1),
    goBack: () => goTo(stepIndex - 1),
  };
}
