"use client";

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@heroui/react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

interface TransactionFormHintProps {
  isAutoCategory: boolean;
  isCategoryMissing: boolean;
}

export function TransactionFormHint({ isAutoCategory, isCategoryMissing }: TransactionFormHintProps) {
  const t = useTranslations("transactions.form");

  function renderHint() {
    if (isAutoCategory) return <Hint key="auto">{t("autoCategoryHint")}</Hint>;
    if (isCategoryMissing) {
      return (
        <Hint key="none" isMuted>
          {t("noCategoryHint")}
        </Hint>
      );
    }
    return null;
  }

  return (
    <div className="min-h-5">
      <AnimatePresence mode="wait" initial={false}>
        {renderHint()}
      </AnimatePresence>
    </div>
  );
}

interface HintProps {
  children: React.ReactNode;
  isMuted?: boolean;
}

function Hint({ children, isMuted = false }: HintProps) {
  return (
    <motion.p
      role="status"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18 }}
      className={cn("m-0 flex items-center gap-1.5 text-xs font-semibold", isMuted ? "text-app-muted" : "text-app-fg")}
    >
      {isMuted ? null : <Sparkles className="size-3.5" strokeWidth={2} />}
      {children}
    </motion.p>
  );
}
