"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";

const HIDDEN = { opacity: 0, y: 40, scale: 0.96 };
const VISIBLE = { opacity: 1, y: 0, scale: 1 };
const TRANSITION = { duration: 0.9, delay: 0.25, ease: EASE_OUT };

export function HeroEntrance({ className, children }: { className?: string; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div initial={reduceMotion ? false : HIDDEN} animate={VISIBLE} transition={TRANSITION} className={className}>
      {children}
    </motion.div>
  );
}
