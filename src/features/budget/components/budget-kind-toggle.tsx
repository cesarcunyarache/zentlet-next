"use client";

import { AnimatePresence, motion } from "motion/react";
import { Repeat, Repeat1 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPRING_PRESS } from "@/lib/ease";
import type { BudgetKind } from "../types";

interface BudgetKindToggleProps {
  kind: BudgetKind;
  onToggle: () => void;
}

const TAP = { scale: 0.92 };
const ICON_INITIAL = { rotate: -90, opacity: 0 };
const ICON_ANIMATE = { rotate: 0, opacity: 1 };
const ICON_EXIT = { rotate: 90, opacity: 0 };
const ICON_TRANSITION = { duration: 0.18 };

export function BudgetKindToggle({ kind, onToggle }: BudgetKindToggleProps) {
  const t = useTranslations("budgets.sheet");
  const isRecurring = kind === "recurring";
  const Icon = isRecurring ? Repeat : Repeat1;
  const hint = t(`kindHint.${kind}`);

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={isRecurring}
      aria-label={hint}
      title={hint}
      whileTap={TAP}
      transition={SPRING_PRESS}
      onClick={onToggle}
      className="text-app-fg hover:bg-app-fill inline-flex min-h-8.5 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-colors"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={kind}
          initial={ICON_INITIAL}
          animate={ICON_ANIMATE}
          exit={ICON_EXIT}
          transition={ICON_TRANSITION}
          className="inline-grid"
        >
          <Icon aria-hidden className="text-app-muted size-3.5" strokeWidth={2.2} />
        </motion.span>
      </AnimatePresence>
      {t(`kinds.${kind}`)}
    </motion.button>
  );
}
