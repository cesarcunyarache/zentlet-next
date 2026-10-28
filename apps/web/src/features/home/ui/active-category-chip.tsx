"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT } from "@/lib/ease";
import type { CategoryLike } from "@/features/transaction/types";

interface ActiveCategoryChipProps {
  category: CategoryLike | undefined;
  onClear: () => void;
}

export function ActiveCategoryChip({ category, onClear }: ActiveCategoryChipProps) {
  const t = useTranslations("transactions.home");

  return (
    <AnimatePresence>
      {category && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 24 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={SPRING_LAYOUT}
          className="overflow-hidden"
        >
          <motion.button
            type="button"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            transition={SPRING_LAYOUT}
            onClick={onClear}
            className="bg-app-fg text-app-surface inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold"
          >
            {category.icon} {category.name}
            <X aria-hidden className="size-3.5" strokeWidth={2.4} />
            <span className="sr-only">{t("clearCategoryFilter")}</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
