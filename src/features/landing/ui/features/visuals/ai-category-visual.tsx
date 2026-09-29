"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import type { DemoCategory } from "../../../content";

const BOUNCE = { y: [0, 4, 0] };
const BOUNCE_TRANSITION = { duration: 1.6, repeat: Infinity, ease: "easeInOut" } as const;
const CHIP_HIDDEN = { opacity: 0, scale: 0.8 };
const CHIP_VISIBLE = { opacity: 1, scale: 1 };
const CHIP_VIEWPORT = { once: true, amount: 0.8 };
const CHIP_TRANSITION = { type: "spring", stiffness: 380, damping: 22, delay: 0.2 } as const;

interface AiCategoryVisualProps {
  from: string;
  category: DemoCategory;
}

export function AiCategoryVisual({ from, category }: AiCategoryVisualProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="flex h-full flex-col items-center justify-center gap-3">
      <span className="bg-app-bg text-app-fg rounded-2xl px-4 py-2.5 text-sm font-medium ring-1 ring-[var(--app-border)]">
        {from}
      </span>
      <motion.span
        animate={reduceMotion ? undefined : BOUNCE}
        transition={BOUNCE_TRANSITION}
        className="text-app-muted"
      >
        <ArrowRight className="size-4 rotate-90" />
      </motion.span>
      <motion.span
        initial={reduceMotion ? false : CHIP_HIDDEN}
        whileInView={CHIP_VISIBLE}
        viewport={CHIP_VIEWPORT}
        transition={CHIP_TRANSITION}
        className="bg-app-fg text-app-bg relative flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold shadow-[0_12px_24px_-12px_color-mix(in_oklch,var(--app-fg)_70%,transparent)]"
      >
        <CategoryEmoji category={category} className="size-7 rounded-full text-sm" />
        {category.name}
        <Sparkles className="size-3.5 text-[oklch(0.85_0.12_85)]" />
      </motion.span>
    </div>
  );
}
