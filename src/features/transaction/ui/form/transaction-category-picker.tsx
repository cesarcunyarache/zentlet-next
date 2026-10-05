"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { useScrollSelectedIntoView } from "../../hooks/form/useScrollSelectedIntoView";
import type { CategoryLike } from "../../types";

interface TransactionCategoryPickerProps {
  categories: CategoryLike[];
  selectedId: string;
  autoCategoryId: string | null;
  canCreate: boolean;
  onCreate: () => void;
  onToggle: (categoryId: string) => void;
}

export function TransactionCategoryPicker({
  categories,
  selectedId,
  autoCategoryId,
  canCreate,
  onCreate,
  onToggle,
}: TransactionCategoryPickerProps) {
  const t = useTranslations("transactions");
  const shouldReduceMotion = Boolean(useReducedMotion());
  const registerChip = useScrollSelectedIntoView(selectedId);

  return (
    <div
      role="group"
      aria-label={t("fields.category")}
      className="scroll-clean -mx-[22px] flex gap-2 overflow-x-auto px-[22px] py-1 sm:-mx-7 sm:px-7"
    >
      {canCreate ? (
        <motion.button
          type="button"
          aria-label={t("form.newCategory")}
          whileTap={{ scale: 0.9 }}
          transition={SPRING_PRESS}
          onClick={onCreate}
          className="bg-app-fill hover:bg-app-fill-strong text-app-fg grid size-11 shrink-0 place-items-center rounded-full transition-colors"
        >
          <Plus className="size-[18px]" strokeWidth={2} />
        </motion.button>
      ) : null}

      <AnimatePresence initial={false} mode="popLayout">
        {categories.map((category) => {
          const isActive = selectedId === category.id;
          return (
            <CategoryChip
              key={category.id}
              ref={registerChip(category.id)}
              category={category}
              isActive={isActive}
              isSuggested={isActive && autoCategoryId === category.id}
              shouldReduceMotion={shouldReduceMotion}
              onClick={() => onToggle(category.id)}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}

interface CategoryChipProps {
  ref: React.Ref<HTMLButtonElement>;
  category: CategoryLike;
  isActive: boolean;
  isSuggested: boolean;
  shouldReduceMotion: boolean;
  onClick: () => void;
}

function CategoryChip({ ref, category, isActive, isSuggested, shouldReduceMotion, onClick }: CategoryChipProps) {
  return (
    <motion.button
      ref={ref}
      type="button"
      aria-pressed={isActive}
      layout={!shouldReduceMotion}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileTap={{ scale: 0.94 }}
      transition={SPRING_PRESS}
      onClick={onClick}
      className={cn(
        "relative flex min-h-11 shrink-0 items-center gap-2 rounded-full py-0 pr-4 pl-2 text-sm font-semibold transition-colors",
        isActive ? "text-app-surface" : "bg-app-fill text-app-fg hover:bg-app-fill-strong",
      )}
    >
      {isActive ? (
        <motion.span
          layoutId="tx-category-pill"
          transition={SPRING_LAYOUT}
          className="bg-app-fg absolute inset-0 rounded-full"
        />
      ) : null}
      <motion.span
        animate={isActive && !shouldReduceMotion ? { scale: [1, 1.25, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative inline-grid"
      >
        <CategoryEmoji category={category} className="size-7 rounded-full text-[15px]" />
      </motion.span>
      <span className="relative">{category.name}</span>
      {isSuggested ? <Sparkles aria-hidden className="relative size-3.5" strokeWidth={2.2} /> : null}
    </motion.button>
  );
}
