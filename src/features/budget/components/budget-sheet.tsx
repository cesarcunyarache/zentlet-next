"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, cn } from "@heroui/react";
import { Check, Repeat, Repeat1 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { PillSelect } from "@/core/components/ui/pill-select";
import { CategoryEmoji } from "@/features/category/components/category-emoji";
import { cleanAmountInput, displayAmount, parseAmount } from "@/features/transaction/lib/format";
import { useTransactionSummary } from "@/features/transaction/stores/transaction.store";
import type { CategoryLike } from "@/features/transaction/types";
import { SPRING_PRESS } from "@/lib/ease";
import { track } from "@/lib/observability/client";
import {
  BUDGET_PERIODS,
  BUDGET_PERIOD_OPTIONS,
  activePeriod,
  budgetPeriodOf,
  limitAt,
  periodContaining,
  todayISO,
} from "../lib/period";
import { BudgetRing } from "./budget-ring";
import { useBudgetStore } from "../stores/budget.store";
import type { BudgetKind, BudgetPeriod, TBudget } from "../types";

interface BudgetSheetProps {
  /** Categoría cuyo presupuesto se edita; `null` cierra la hoja. */
  category: CategoryLike | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
  onRemoved: () => void;
}

const BUTTON = "min-h-[54px] rounded-2xl text-base font-semibold transition-[background-color,color,transform] active:scale-[0.98]";

interface Draft {
  period: BudgetPeriod;
  kind: BudgetKind;
  rawAmount: string;
}

function currentLimit(budget: TBudget | undefined) {
  const period = budget && activePeriod(budget, todayISO());
  return budget && period ? limitAt(budget, period.from) : null;
}

function draftFrom(budget: TBudget | undefined): Draft {
  const limit = currentLimit(budget);
  return {
    period: (budget && budgetPeriodOf(budget)) ?? "monthly",
    kind: budget?.kind ?? "recurring",
    rawAmount: limit ? String(limit) : "",
  };
}

export function BudgetSheet({ category, currency, onClose, onSaved, onRemoved }: BudgetSheetProps) {
  const t = useTranslations("budgets.sheet");
  const tActions = useTranslations("common.actions");
  const { budgets, saveBudget, deleteBudget } = useBudgetStore();

  const [shown, setShown] = useState<CategoryLike | null>(null);
  const [opened, setOpened] = useState<CategoryLike | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(undefined));
  const [confirming, setConfirming] = useState(false);

  const budgetFor = (id: string) => budgets.find((budget) => budget.categoryId === id);

  if (category !== opened) {
    setOpened(category);
    if (category) {
      setShown(category);
      setDraft(draftFrom(budgetFor(category.id)));
      setConfirming(false);
    }
  }

  const budget = shown ? budgetFor(shown.id) : undefined;
  const saved = draftFrom(budget);
  const limit = currentLimit(budget);
  const isActive = limit !== null;
  const changesRule = isActive && (draft.period !== saved.period || draft.kind !== saved.kind);
  const amount = parseAmount(draft.rawAmount);
  const canSave = amount > 0 && (!isActive || changesRule || amount !== limit);

  const today = todayISO();
  const range = periodContaining(BUDGET_PERIODS[draft.period], today);
  const { data: summary } = useTransactionSummary(range);
  const spent = shown ? (summary?.byCategory[shown.id]?.expense ?? 0) : 0;

  const update = (changes: Partial<Draft>) => setDraft((current) => ({ ...current, ...changes }));

  function save() {
    if (!shown || !canSave) return;
    saveBudget({ categoryId: shown.id, amount, period: draft.period, kind: draft.kind });
    track("budget_saved", { created: !budget, period: draft.period, kind: draft.kind });
    onSaved();
  }

  function remove() {
    if (!budget) return;
    if (!confirming) return setConfirming(true);
    deleteBudget(budget.id);
    track("budget_deleted", {});
    onRemoved();
  }

  return (
    <Sheet
      isOpen={Boolean(category)}
      onOpenChange={(open) => !open && onClose()}
      title={shown ? t("title", { name: shown.name }) : ""}
      hideTitle
      footer={
        <div className="flex gap-2.5">
          {budget && (
            <Button
              type="button"
              onPress={remove}
              className={cn(
                BUTTON,
                "flex-1 overflow-hidden",
                confirming
                  ? "bg-app-expense text-app-surface"
                  : "bg-app-expense-soft text-[color-mix(in_oklch,var(--app-expense)_78%,black)]",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={confirming ? "confirm" : "idle"}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.16 }}
                >
                  {t(confirming ? "confirmRemove" : "remove")}
                </motion.span>
              </AnimatePresence>
            </Button>
          )}
          <Button
            type="button"
            onPress={save}
            isDisabled={!canSave}
            className={cn(
              BUTTON,
              "bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted flex-[2]",
            )}
          >
            <Check className="size-[17px]" strokeWidth={2.4} />
            {tActions("save")}
          </Button>
        </div>
      }
    >
      {shown && (
        <form
          className="flex flex-col gap-5 pt-2 pb-2"
          onSubmit={(event) => {
            event.preventDefault();
            save();
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
              options={BUDGET_PERIOD_OPTIONS.map((value) => ({ value, label: t(`periods.${value}`) }))}
              onChange={(period) => update({ period })}
              className="hover:bg-app-fill"
            />
            <KindChip
              kind={draft.kind}
              label={t(`kinds.${draft.kind}`)}
              hint={t(`kindHint.${draft.kind}`)}
              onToggle={() => update({ kind: draft.kind === "recurring" ? "once" : "recurring" })}
            />
          </div>

          <div className="flex items-end gap-3">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-app-muted text-[13px] font-semibold">{t("heading")}</span>
              <span className="font-display text-app-fg flex items-baseline gap-1 text-[34px] font-bold tracking-[-0.035em] tabular-nums">
                <span className="text-[24px]">{currency}</span>
                <input
                  value={displayAmount(draft.rawAmount)}
                  onChange={(event) => update({ rawAmount: cleanAmountInput(event.target.value.replace(/,/g, "")) })}
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  maxLength={16}
                  autoComplete="off"
                  autoFocus
                  className="placeholder:text-app-muted/40 min-w-0 flex-1 border-0 bg-transparent p-0 outline-none"
                />
              </span>
            </label>
            <BudgetRing spent={spent} amount={amount} range={range} today={today} currency={currency} />
          </div>
        </form>
      )}
    </Sheet>
  );
}

function KindChip({
  kind,
  label,
  hint,
  onToggle,
}: {
  kind: BudgetKind;
  label: string;
  hint: string;
  onToggle: () => void;
}) {
  const Icon = kind === "recurring" ? Repeat : Repeat1;

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={kind === "recurring"}
      aria-label={hint}
      title={hint}
      whileTap={{ scale: 0.92 }}
      transition={SPRING_PRESS}
      onClick={onToggle}
      className="text-app-fg hover:bg-app-fill inline-flex min-h-8.5 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-colors"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={kind}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="inline-grid"
        >
          <Icon aria-hidden className="text-app-muted size-3.5" strokeWidth={2.2} />
        </motion.span>
      </AnimatePresence>
      {label}
    </motion.button>
  );
}
