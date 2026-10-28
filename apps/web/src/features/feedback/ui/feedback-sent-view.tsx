"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { SPRINKLES } from "./feedback-motion";

interface FeedbackSentViewProps {
  shouldReduceMotion: boolean;
}

export function FeedbackSentView({ shouldReduceMotion }: FeedbackSentViewProps) {
  const t = useTranslations("settings.feedback");

  return (
    <div
      role="status"
      className="bg-app-fill flex flex-col items-center justify-center gap-1.5 rounded-[22px] px-5 py-8 text-center"
    >
      <div className="relative mb-1 flex size-12 items-center justify-center">
        {!shouldReduceMotion && <Sprinkles />}
        <SuccessCheck shouldReduceMotion={shouldReduceMotion} />
      </div>
      <h3 className="text-app-fg m-0 text-base font-semibold">{t("thanksTitle")}</h3>
      <p className="text-app-muted m-0 text-sm leading-relaxed">{t("thanksBody")}</p>
    </div>
  );
}

function Sprinkles() {
  return SPRINKLES.map((sprinkle, index) => (
    <motion.span
      key={`${sprinkle.x}-${sprinkle.y}`}
      initial={{ opacity: 0, scale: 0.4, x: 0, y: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4], x: sprinkle.x, y: sprinkle.y }}
      transition={{ duration: 0.6, delay: 0.18 + index * 0.02, ease: "easeOut" }}
      style={{ backgroundColor: sprinkle.color }}
      className="absolute size-1.5 rounded-full"
    />
  ));
}

function SuccessCheck({ shouldReduceMotion }: FeedbackSentViewProps) {
  return (
    <motion.div
      initial={shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
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
          initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
        />
      </motion.svg>
    </motion.div>
  );
}
