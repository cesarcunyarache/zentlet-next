"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../../../content";

const ROTATION_INTERVAL_MS = 1800;

type Currencies = LandingContent["features"]["samples"]["currencies"];

function useRotatingIndex(count: number, isPaused: boolean) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => setActiveIndex((value) => (value + 1) % count), ROTATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, isPaused]);

  return activeIndex;
}

export function CurrencyVisual({ currencies }: { currencies: Currencies }) {
  const reduceMotion = useReducedMotion();
  const activeIndex = useRotatingIndex(currencies.length, Boolean(reduceMotion));

  return (
    <div aria-hidden className="flex h-full items-center justify-center">
      <div className="bg-app-fill flex gap-1 rounded-full p-1.5">
        {currencies.map((currency, index) => {
          const isActive = index === activeIndex;

          return (
            <span
              key={currency.symbol}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors duration-300",
                isActive ? "text-app-bg" : "text-app-muted",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="currency-pill"
                  transition={SPRING_LAYOUT}
                  className="bg-app-fg absolute inset-0 rounded-full"
                />
              )}
              <span className="num relative text-base">{currency.symbol}</span>
              <span className="relative hidden sm:inline">{currency.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
