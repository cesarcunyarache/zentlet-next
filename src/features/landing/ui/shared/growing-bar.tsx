"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

const COLLAPSED = { scaleX: 0 };

interface GrowingBarProps {
  ratio: number;
  color: string;
  duration: number;
  delay: number;
  viewportAmount: number;
  className?: string;
}

export function GrowingBar({ ratio, color, duration, delay, viewportAmount, className }: GrowingBarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("bg-app-fill overflow-hidden rounded-full", className)}>
      <motion.div
        className="h-full origin-left rounded-full"
        style={{ background: color }}
        initial={reduceMotion ? false : COLLAPSED}
        whileInView={{ scaleX: ratio }}
        viewport={{ once: true, amount: viewportAmount }}
        transition={{ duration, delay, ease: EASE_OUT }}
      />
    </div>
  );
}
