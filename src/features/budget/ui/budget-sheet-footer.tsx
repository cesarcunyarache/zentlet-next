"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button, cn } from "@heroui/react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface BudgetSheetFooterProps {
  hasBudget: boolean;
  isConfirmingRemove: boolean;
  canSave: boolean;
  onRemove: () => void;
  onSave: () => void;
  upgrade?: ReactNode;
}

interface RemoveBudgetButtonProps {
  isConfirming: boolean;
  onPress: () => void;
}

const BUTTON_CLASS =
  "min-h-[54px] rounded-2xl text-base font-semibold transition-[background-color,color,transform] active:scale-[0.98]";

const LABEL_INITIAL = { opacity: 0, y: 12 };
const LABEL_ANIMATE = { opacity: 1, y: 0 };
const LABEL_EXIT = { opacity: 0, y: -12 };
const LABEL_TRANSITION = { duration: 0.16 };

export function BudgetSheetFooter({
  hasBudget,
  isConfirmingRemove,
  canSave,
  onRemove,
  onSave,
  upgrade,
}: BudgetSheetFooterProps) {
  const tActions = useTranslations("common.actions");

  return (
    <div className="flex gap-2.5">
      {hasBudget && <RemoveBudgetButton isConfirming={isConfirmingRemove} onPress={onRemove} />}
      {upgrade ?? (
        <Button
          type="button"
          onPress={onSave}
          isDisabled={!canSave}
          className={cn(
            BUTTON_CLASS,
            "bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted flex-[2]",
          )}
        >
          <Check className="size-[17px]" strokeWidth={2.4} />
          {tActions("save")}
        </Button>
      )}
    </div>
  );
}

function RemoveBudgetButton({ isConfirming, onPress }: RemoveBudgetButtonProps) {
  const t = useTranslations("budgets.sheet");

  return (
    <Button
      type="button"
      onPress={onPress}
      className={cn(
        BUTTON_CLASS,
        "flex-1 overflow-hidden",
        isConfirming
          ? "bg-app-expense text-app-surface"
          : "bg-app-expense-soft text-[color-mix(in_oklch,var(--app-expense)_78%,black)]",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isConfirming ? "confirm" : "idle"}
          initial={LABEL_INITIAL}
          animate={LABEL_ANIMATE}
          exit={LABEL_EXIT}
          transition={LABEL_TRANSITION}
        >
          {t(isConfirming ? "confirmRemove" : "remove")}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
