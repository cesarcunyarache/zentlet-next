"use client";

import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPRING_LAYOUT } from "@/lib/ease";

interface HomeSearchFieldProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (query: string) => void;
}

export function HomeSearchField({ isOpen, query, onQueryChange }: HomeSearchFieldProps) {
  const t = useTranslations("transactions.home");

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.label
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 24 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={SPRING_LAYOUT}
          className="bg-app-fill flex items-center gap-2 overflow-hidden rounded-2xl px-3.5"
        >
          <Search className="text-app-muted size-4 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchLabel")}
            autoFocus
            className="placeholder:text-app-muted h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
          />
        </motion.label>
      )}
    </AnimatePresence>
  );
}
