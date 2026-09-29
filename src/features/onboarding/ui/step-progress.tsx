"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT } from "@/lib/ease";
import { ONBOARDING_STEPS } from "../lib/steps";

interface StepProgressProps {
  stepIndex: number;
}

const ACTIVE_DOT_WIDTH = 28;
const DOT_WIDTH = 8;

export function StepProgress({ stepIndex }: StepProgressProps) {
  const t = useTranslations("onboarding");
  const current = stepIndex + 1;
  const total = ONBOARDING_STEPS.length;

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-valuetext={t("progress", { current, total })}
      className="flex items-center gap-1.5"
    >
      {ONBOARDING_STEPS.map((name, index) => (
        <motion.span
          key={name}
          animate={{ width: index === stepIndex ? ACTIVE_DOT_WIDTH : DOT_WIDTH }}
          transition={SPRING_LAYOUT}
          className={`h-2 rounded-full transition-colors ${index <= stepIndex ? "bg-app-fg" : "bg-app-fill-strong"}`}
        />
      ))}
    </div>
  );
}
