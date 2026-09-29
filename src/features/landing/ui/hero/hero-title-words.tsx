"use client";

import { useReducedMotion } from "motion/react";
import { WordRotate } from "@/core/components/ui/word-rotate";
import { EASE_OUT } from "@/lib/ease";

const WORD_DURATION_MS = 2800;
const STATIC_WORD_MOTION = {};
const WORD_MOTION = {
  initial: { opacity: 0, y: "60%", filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: "-60%", filter: "blur(8px)" },
  transition: { duration: 0.45, ease: EASE_OUT },
};

export function HeroTitleWords({ words }: { words: string[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <WordRotate
      words={words}
      duration={WORD_DURATION_MS}
      className="text-app-expense whitespace-nowrap"
      motionProps={reduceMotion ? STATIC_WORD_MOTION : WORD_MOTION}
    />
  );
}
