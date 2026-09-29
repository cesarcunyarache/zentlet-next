"use client";

import { motion, useReducedMotion } from "motion/react";
import { Hand } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategoryEmoji } from "@/features/category/components/category-emoji";
import { EASE_OUT } from "@/lib/ease";
import { FOOD, Glow, HOME, Pop, SceneFrame, TRANSPORT } from "./scene-primitives";

interface BudgetSceneProps {
  currency: string;
}

interface SampleBudget {
  key: "food" | "transport" | "home";
  category: { icon: string; color: string };
  spent: number;
  budget: number;
}

interface BudgetRowProps {
  item: SampleBudget;
  index: number;
  currency: string;
}

const SAMPLE_BUDGETS: readonly SampleBudget[] = [
  { key: "food", category: FOOD, spent: 480, budget: 600 },
  { key: "transport", category: TRANSPORT, spent: 95, budget: 200 },
  { key: "home", category: HOME, spent: 330, budget: 300 },
];

const BAR_HIDDEN = { scaleX: 0 };
const BAR_DELAY = 0.3;
const BAR_STAGGER = 0.2;

export function BudgetScene({ currency }: BudgetSceneProps) {
  const t = useTranslations("onboarding.steps.budget");

  return (
    <SceneFrame>
      <Glow className="-top-24 -right-16 bg-[color-mix(in_oklch,var(--app-income)_20%,transparent)]" />

      <ul className="relative m-0 flex w-[82%] list-none flex-col gap-4 p-0">
        {SAMPLE_BUDGETS.map((item, index) => (
          <BudgetRow key={item.key} item={item} index={index} currency={currency} />
        ))}
      </ul>

      <div className="relative mt-6 flex flex-wrap justify-center gap-2 px-4">
        <Pop delay={1.3} className="bg-app-expense-soft text-app-expense rounded-full px-3 py-1.5 text-xs font-semibold">
          {t("over")}
        </Pop>
        <Pop delay={1.5} className="bg-app-fill text-app-fg flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
          <Hand className="size-3.5" />
          {t("hold")}
        </Pop>
      </div>
    </SceneFrame>
  );
}

function BudgetRow({ item, index, currency }: BudgetRowProps) {
  const t = useTranslations("onboarding.steps.budget");
  const reduceMotion = useReducedMotion();
  const isOver = item.spent > item.budget;
  const share = Math.min(item.spent / item.budget, 1);

  return (
    <li className="flex items-center gap-3">
      <CategoryEmoji category={item.category} className="size-9 shrink-0 rounded-xl text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-app-fg font-semibold">{t(`categories.${item.key}`)}</span>
          <span className={isOver ? "text-app-expense font-bold" : "text-app-muted font-medium"}>
            {currency} {item.spent} / {item.budget}
          </span>
        </div>
        <div className="bg-app-fill mt-1.5 h-2 overflow-hidden rounded-full">
          <motion.div
            className={`h-full origin-left rounded-full ${isOver ? "bg-app-expense" : "bg-app-income"}`}
            initial={reduceMotion ? false : BAR_HIDDEN}
            animate={{ scaleX: share }}
            transition={{ duration: 0.9, delay: BAR_DELAY + index * BAR_STAGGER, ease: EASE_OUT }}
          />
        </div>
      </div>
    </li>
  );
}
