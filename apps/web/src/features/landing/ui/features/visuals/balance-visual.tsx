"use client";

import { motion, useReducedMotion } from "motion/react";
import { NumberTicker } from "@/core/components/ui/number-ticker";
import { EASE_OUT } from "@/lib/ease";

const CURVE_PATH = "M2 52 C 30 50, 40 30, 66 34 S 104 56, 128 40 S 170 10, 196 18 S 228 12, 238 6";
const UNDRAWN = { pathLength: 0 };
const DRAWN = { pathLength: 1 };
const DRAW_VIEWPORT = { once: true, amount: 0.8 };
const DRAW_TRANSITION = { duration: 1.6, ease: EASE_OUT };

interface BalanceVisualProps {
  value: number;
  currency: string;
  locale: string;
}

export function BalanceVisual({ value, currency, locale }: BalanceVisualProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="flex h-full flex-col justify-center gap-3">
      <p className="font-display text-app-income m-0 text-4xl leading-none font-bold tracking-[-0.04em]">
        <span className="text-app-muted mr-1.5 text-lg font-semibold">{currency}</span>
        <NumberTicker value={value} decimalPlaces={2} locale={locale} />
      </p>
      <svg viewBox="0 0 240 64" className="h-16 w-full overflow-visible" fill="none">
        <motion.path
          d={CURVE_PATH}
          stroke="var(--app-income)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={reduceMotion ? false : UNDRAWN}
          whileInView={DRAWN}
          viewport={DRAW_VIEWPORT}
          transition={DRAW_TRANSITION}
        />
      </svg>
    </div>
  );
}
