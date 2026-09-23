"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { TypingAnimation } from "@/core/components/ui/typing-animation";
import { BorderBeam } from "@/core/components/ui/border-beam";
import { CategoryEmoji } from "@/features/transaction/components/category-emoji";
import { SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { LandingContent } from "../../content";
import { formatAmount } from "../../lib/format";

type Phase = "typing" | "reading" | "suggested";

const TYPE_SPEED = 65;
const READING_MS = 700;
const SUGGESTED_MS = 2600;

interface ExpenseComposerDemoProps {
  demo: LandingContent["hero"]["demo"];
  common: LandingContent["common"];
  locale: string;
}

/**
 * Réplica del alta de un movimiento: se escribe una frase, Zentlet la lee
 * y propone monto, tipo y categoría. Recorre los ejemplos en bucle.
 */
export function ExpenseComposerDemo({ demo, common, locale }: ExpenseComposerDemoProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(reduceMotion ? "suggested" : "typing");
  const entry = demo.entries[index];

  useEffect(() => {
    if (reduceMotion) return;

    const typed = Array.from(entry.typed).length * TYPE_SPEED + 250;
    const timers = [
      setTimeout(() => setPhase("reading"), typed),
      setTimeout(() => setPhase("suggested"), typed + READING_MS),
      setTimeout(() => {
        setPhase("typing");
        setIndex((value) => (value + 1) % demo.entries.length);
      }, typed + READING_MS + SUGGESTED_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [entry.typed, demo.entries.length, reduceMotion]);

  const isIncome = entry.type === "income";
  const ready = phase === "suggested";

  return (
    // decorativa y en bucle: el subtítulo del hero ya cuenta lo mismo
    <div aria-hidden className="bg-app-surface relative w-full overflow-hidden rounded-[28px] p-5 shadow-[0_40px_80px_-32px_color-mix(in_oklch,var(--app-fg)_45%,transparent),0_2px_6px_color-mix(in_oklch,var(--app-fg)_6%,transparent)] sm:p-6">
      <BorderBeam size={120} duration={8} colorFrom="var(--app-expense)" colorTo="oklch(0.82 0.14 85)" borderWidth={1.5} />

      <div className="flex items-center justify-between">
        <p className="text-app-muted m-0 text-xs font-semibold tracking-wide uppercase">{demo.label}</p>
        <span className="bg-app-fill text-app-muted rounded-full px-2.5 py-1 text-[11px] font-semibold">
          {common.currency}
        </span>
      </div>

      {/* el campo de texto */}
      <div className="bg-app-bg mt-4 flex min-h-14 items-center rounded-2xl px-4 ring-1 ring-[var(--app-border)]">
        {reduceMotion ? (
          <span className="text-app-fg text-lg font-medium">{entry.typed}</span>
        ) : (
          <TypingAnimation
            key={index}
            startOnView={false}
            typeSpeed={TYPE_SPEED}
            cursorStyle="line"
            className="text-app-fg text-lg leading-normal font-medium tracking-normal"
          >
            {entry.typed}
          </TypingAnimation>
        )}
      </div>

      {/* lo que Zentlet deduce */}
      <div className="mt-5 grid min-h-[132px] gap-3">
        <AnimatePresence mode="wait">
          {phase === "reading" && (
            <motion.p
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-app-muted m-0 flex items-center gap-2 text-sm"
            >
              <Sparkles className="size-4 animate-pulse" aria-hidden />
              {demo.reading}
            </motion.p>
          )}

          {ready && (
            <motion.div
              key={`result-${index}`}
              initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={SPRING_SWAP}
              className="flex flex-col gap-3"
            >
              <p
                className={cn(
                  "font-display m-0 text-[40px] leading-none font-bold tracking-[-0.04em] tabular-nums",
                  isIncome ? "text-app-income" : "text-app-fg",
                )}
              >
                <span className="text-app-muted mr-1.5 text-xl font-semibold">
                  {isIncome ? "+" : "−"} {common.currency}
                </span>
                {formatAmount(entry.amount, locale)}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    isIncome ? "bg-app-income-soft text-app-income" : "bg-app-expense-soft text-app-expense",
                  )}
                >
                  {isIncome ? common.income : common.expense}
                </span>
                <span className="bg-app-fill text-app-fg flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-semibold">
                  <CategoryEmoji category={entry.category} className="size-6 rounded-full text-sm" />
                  {entry.category.name}
                </span>
                <span className="text-app-muted flex items-center gap-1 text-[11px] font-semibold">
                  <Sparkles className="size-3.5" aria-hidden />
                  {demo.suggestion}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={cn(
          "mt-2 flex h-12 items-center justify-center rounded-2xl text-sm font-semibold transition-colors duration-300",
          ready ? "bg-app-fg text-app-bg" : "bg-app-fill text-app-muted",
        )}
      >
        {demo.save}
      </div>
    </div>
  );
}
