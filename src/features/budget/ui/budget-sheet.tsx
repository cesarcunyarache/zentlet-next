"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { PillSelect } from "@/core/components/ui/pill-select";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import type { CategoryBase } from "@/features/category/types";
import { BUDGET_PERIOD_OPTIONS } from "../lib/period";
import { useBudgetSheet } from "../hooks/useBudgetSheet";
import { BudgetAmountField } from "./budget-amount-field";
import { BudgetKindToggle } from "./budget-kind-toggle";
import { BudgetRing } from "./budget-ring";
import { BudgetSheetFooter } from "./budget-sheet-footer";

interface BudgetSheetProps {
  category: CategoryBase | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
  onRemoved: () => void;
}

export function BudgetSheet({ category, currency, onClose, onSaved, onRemoved }: BudgetSheetProps) {
  const t = useTranslations("budgets.sheet");
  const sheet = useBudgetSheet({ category, onSaved, onRemoved });
  const { shown, draft } = sheet;

  const periodOptions = BUDGET_PERIOD_OPTIONS.map((value) => ({ value, label: t(`periods.${value}`) }));

  return (
    <Sheet
      isOpen={Boolean(category)}
      onOpenChange={(open) => !open && onClose()}
      title={shown ? t("title", { name: shown.name }) : ""}
      hideTitle
      footer={
        <BudgetSheetFooter
          hasBudget={sheet.hasBudget}
          isConfirmingRemove={sheet.isConfirmingRemove}
          canSave={sheet.canSave}
          onRemove={sheet.remove}
          onSave={sheet.save}
        />
      }
    >
      {shown && (
        <form
          className="flex flex-col gap-5 pt-2 pb-2"
          onSubmit={(event) => {
            event.preventDefault();
            sheet.save();
          }}
        >
          <div className="flex items-center gap-3.5">
            <CategoryEmoji category={shown} className="size-[52px] rounded-2xl text-[25px]" />
            <span className="font-display text-app-fg truncate text-[21px] font-bold tracking-[-0.02em]">
              {shown.name}
            </span>
          </div>

          <div className="-mx-2.5 flex items-center">
            <PillSelect
              label={t("period")}
              value={draft.period}
              options={periodOptions}
              onChange={sheet.changePeriod}
              className="hover:bg-app-fill"
            />
            <BudgetKindToggle kind={draft.kind} onToggle={sheet.toggleKind} />
          </div>

          <div className="flex items-end gap-3">
            <BudgetAmountField currency={currency} rawAmount={draft.rawAmount} onChange={sheet.changeAmount} />
            <BudgetRing
              spent={sheet.spent}
              amount={sheet.amount}
              range={sheet.range}
              today={sheet.today}
              currency={currency}
            />
          </div>
        </form>
      )}
    </Sheet>
  );
}
