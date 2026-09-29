"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { TypingAnimation } from "@/core/components/ui/typing-animation";
import { BorderBeam } from "@/core/components/ui/border-beam";
import { CategoryEmoji } from "@/features/category/components/category-emoji";
import { SPRING_SWAP } from "@/lib/ease";
import { cn } from "@/lib/utils";
import type { DemoEntry, LandingContent } from "../../content";
import { amountSign, formatAmount } from "../../lib/format";
import { TYPE_SPEED_MS, useComposerCycle } from "../../lib/use-composer-cycle";
import { DemoTypingField } from "../shared/demo-typing-field";
import { BRAND_ACCENT, GOLD_ACCENT, TYPED_TEXT_CLASS } from "../shared/tokens";

const READING_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const RESULT_MOTION = {
  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -6, filter: "blur(4px)" },
  transition: SPRING_SWAP,
};

type Demo = LandingContent["hero"]["demo"];
type Common = LandingContent["common"];

interface ExpenseComposerDemoProps {
  demo: Demo;
  common: Common;
  locale: string;
}

export function ExpenseComposerDemo({ demo, common, locale }: ExpenseComposerDemoProps) {
  const reduceMotion = useReducedMotion();
  const { index, entry, phase } = useComposerCycle(demo.entries, Boolean(reduceMotion));
  const isReady = phase === "suggested";

  return (
    <div
      aria-hidden
      className="bg-app-surface relative w-full overflow-hidden rounded-[28px] p-5 shadow-[0_40px_80px_-32px_color-mix(in_oklch,var(--app-fg)_45%,transparent),0_2px_6px_color-mix(in_oklch,var(--app-fg)_6%,transparent)] sm:p-6"
    >
      <BorderBeam size={120} duration={8} colorFrom={BRAND_ACCENT} colorTo={GOLD_ACCENT} borderWidth={1.5} />

      <div className="flex items-center justify-between">
        <p className="text-app-muted m-0 text-xs font-semibold tracking-wide uppercase">{demo.label}</p>
        <span className="bg-app-fill text-app-muted rounded-full px-2.5 py-1 text-[11px] font-semibold">
          {common.currency}
        </span>
      </div>

      <DemoTypingField staticText={entry.typed} className="mt-4">
        <TypingAnimation
          key={index}
          startOnView={false}
          typeSpeed={TYPE_SPEED_MS}
          cursorStyle="line"
          className={TYPED_TEXT_CLASS}
        >
          {entry.typed}
        </TypingAnimation>
      </DemoTypingField>

      <div className="mt-5 grid min-h-[132px] gap-3">
        <AnimatePresence mode="wait">
          {phase === "reading" && (
            <motion.p key="reading" {...READING_FADE} className="text-app-muted m-0 flex items-center gap-2 text-sm">
              <Sparkles className="size-4 animate-pulse" aria-hidden />
              {demo.reading}
            </motion.p>
          )}

          {isReady && (
            <motion.div key={`result-${index}`} {...RESULT_MOTION} className="flex flex-col gap-3">
              <ComposerSuggestion entry={entry} common={common} suggestion={demo.suggestion} locale={locale} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={cn(
          "mt-2 flex h-12 items-center justify-center rounded-2xl text-sm font-semibold transition-colors duration-300",
          isReady ? "bg-app-fg text-app-bg" : "bg-app-fill text-app-muted",
        )}
      >
        {demo.save}
      </div>
    </div>
  );
}

interface ComposerSuggestionProps {
  entry: DemoEntry;
  common: Common;
  suggestion: string;
  locale: string;
}

function ComposerSuggestion({ entry, common, suggestion, locale }: ComposerSuggestionProps) {
  const isIncome = entry.type === "income";

  return (
    <>
      <p
        className={cn(
          "font-display m-0 text-[40px] leading-none font-bold tracking-[-0.04em] tabular-nums",
          isIncome ? "text-app-income" : "text-app-fg",
        )}
      >
        <span className="text-app-muted mr-1.5 text-xl font-semibold">
          {amountSign(entry.type)} {common.currency}
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
          {suggestion}
        </span>
      </div>
    </>
  );
}
