"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT } from "@/lib/ease";
import { CHART_HEIGHT } from "../../lib/chart";
import type { CategoryLike } from "../../types";
import { CategoryColumn } from "./category-column";
import type { CategoryTotal } from "../../types";
import { stripScaleMax } from "../../lib/category-strip";


const GHOST_BARS = [
  { id: "first", ratio: 1 },
  { id: "second", ratio: 0.78 },
  { id: "third", ratio: 0.6 },
  { id: "fourth", ratio: 0.34 },
];
const GHOST_STAGGER_SECONDS = 0.06;

interface CategoryStripProps {
  data: CategoryTotal[];
  currency: string;
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
  onLongPress: (category: CategoryLike) => void;
}

export function CategoryStrip({ data, currency, selectedId, onSelect, onLongPress }: CategoryStripProps) {
  const t = useTranslations("transactions.strip");
  const shouldReduceMotion = Boolean(useReducedMotion());
  const max = stripScaleMax(data);

  if (max === 0) return <GhostStrip shouldReduceMotion={shouldReduceMotion} />;

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="scroll-clean -mx-5 flex items-end gap-2.5 overflow-x-auto px-5 sm:-mx-6 sm:px-6"
      style={{ height: CHART_HEIGHT }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {data.map((item, index) => (
          <CategoryColumn
            key={item.category.id}
            item={item}
            index={index}
            max={max}
            currency={currency}
            selectedId={selectedId}
            shouldReduceMotion={shouldReduceMotion}
            onSelect={onSelect}
            onLongPress={onLongPress}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function GhostStrip({ shouldReduceMotion }: { shouldReduceMotion: boolean }) {
  return (
    <div aria-hidden className="flex items-end gap-2.5" style={{ height: CHART_HEIGHT }}>
      {GHOST_BARS.map(({ id, ratio }, index) => (
        <motion.span
          key={id}
          initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: `${ratio * 100}%`, opacity: 1 }}
          transition={{
            ...SPRING_LAYOUT,
            delay: shouldReduceMotion ? 0 : index * GHOST_STAGGER_SECONDS,
          }}
          className="bg-app-fill flex-1 rounded-3xl"
        />
      ))}
    </div>
  );
}
