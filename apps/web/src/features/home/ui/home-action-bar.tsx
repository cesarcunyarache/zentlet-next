"use client";

import { motion } from "motion/react";
import { LayoutGrid, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import type { TransactionFormValues } from "@/features/transaction/schemas/transaction.schema";
import type { CategoryLike } from "@/features/transaction/types";
import { ReceiptScan } from "@/features/transaction/ui/receipt/receipt-scan";
import { VoiceEntry } from "@/features/transaction/ui/voice/voice-entry";
import { IconButton } from "./icon-button";

interface HomeActionBarProps {
  categories: CategoryLike[];
  currency: string;
  isSearching: boolean;
  onOpenCategories: () => void;
  onToggleSearch: () => void;
  onCreate: (draft?: Partial<TransactionFormValues>) => void;
  onQuickSave: (values: TransactionFormValues) => void;
}

export function HomeActionBar({
  categories,
  currency,
  isSearching,
  onOpenCategories,
  onToggleSearch,
  onCreate,
  onQuickSave,
}: HomeActionBarProps) {
  const t = useTranslations("transactions.home");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(20px+env(safe-area-inset-bottom))] z-30">
      <div className="mx-auto flex max-w-xl items-center justify-between px-5 sm:px-6">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SPRING_LAYOUT}
          className="bg-app-surface/90 pointer-events-auto flex items-center gap-1 rounded-full p-1.5 shadow-[0_8px_28px_-10px_color-mix(in_oklch,var(--app-fg)_30%,transparent)] backdrop-blur-xl"
        >
          <IconButton label={t("categories")} onClick={onOpenCategories}>
            <LayoutGrid className="size-5" strokeWidth={1.7} />
          </IconButton>
          <IconButton label={t(isSearching ? "closeSearch" : "search")} pressed={isSearching} onClick={onToggleSearch}>
            {isSearching ? <X className="size-5" strokeWidth={1.8} /> : <Search className="size-5" strokeWidth={1.7} />}
          </IconButton>
        </motion.div>

        <div className="relative">
          <div className="absolute bottom-full left-1/2 mb-3 flex -translate-x-1/2 flex-col items-center gap-3">
            <ReceiptScan categories={categories} currency={currency} onSave={onQuickSave} onEdit={onCreate} />
            <VoiceEntry categories={categories} currency={currency} onSave={onQuickSave} onEdit={onCreate} />
          </div>
          <motion.button
            type="button"
            aria-label={t("create")}
            onClick={() => onCreate()}
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.88 }}
            transition={SPRING_PRESS}
            className="action-glass pointer-events-auto text-white grid size-16 place-items-center rounded-full"
          >
            <Plus className="size-7" strokeWidth={2.4} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
