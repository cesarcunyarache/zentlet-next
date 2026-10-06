"use client";

import { Button } from "@heroui/react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import { CategoryFormSheet } from "@/features/category/ui/category-form-sheet";
import type { RecurrenceFrequency } from "@/features/recurring/types";
import { track } from "@/lib/observability/client";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";
import { TransactionAmountField } from "./transaction-amount-field";
import { TransactionCategoryPicker } from "./transaction-category-picker";
import { TransactionDateField } from "./transaction-date-field";
import { TransactionFormHint } from "./transaction-form-hint";
import { TransactionRepeatField } from "./transaction-repeat-field";
import {
  finalizeFormValues,
  firstWord,
  isAutoSelectedCategory,
  shouldHintMissingCategory,
  transactionCreatedPayload,
  transactionUpdatedPayload,
  visibleCategoriesFor,
} from "../../lib/transaction-form";
import { TransactionTypeToggle } from "./transaction-type-toggle";
import { useCategoryCreation } from "../../hooks/form/useCategoryCreation";
import { useTransactionForm } from "../../hooks/form/useTransactionForm";

const DESCRIPTION_MAX_LENGTH = 42;

interface TransactionFormSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryLike[];
  currency: string;
  onSubmit: (values: TransactionFormValues, recurrence: RecurrenceFrequency | null) => void;
  draft?: Partial<TransactionFormValues>;
  isEditing?: boolean;
}

export function TransactionFormSheet({
  isOpen,
  onOpenChange,
  categories,
  currency,
  onSubmit,
  draft,
  isEditing = false,
}: TransactionFormSheetProps) {
  const t = useTranslations();
  const transactionForm = useTransactionForm({ isOpen, draft, categories });
  const { values, autoCategoryId } = transactionForm;
  const { isCreating, startCreating, stopCreating } = useCategoryCreation(categories, (created) =>
    transactionForm.selectCategory(created.id),
  );

  const isAutoCategory = isAutoSelectedCategory(autoCategoryId, values.categoryId);
  const isCategoryMissing = shouldHintMissingCategory({
    categoryId: values.categoryId,
    description: values.description,
    isThinking: transactionForm.isThinking,
  });

  function saveTransaction(submitted: TransactionFormValues) {
    onSubmit(finalizeFormValues(submitted, categories, t("transactions.defaultDescription")), transactionForm.recurrence);
    onOpenChange(false);
    if (isEditing) {
      track("transaction_updated", transactionUpdatedPayload(submitted, draft));
      return;
    }
    track("transaction_created", transactionCreatedPayload(submitted, draft, autoCategoryId));
    if (transactionForm.recurrence) track("recurring_created", { frequency: transactionForm.recurrence });
  }

  return (
    <>
      <Sheet
        isOpen={isOpen && !isCreating}
        onOpenChange={onOpenChange}
        title={t(isEditing ? "transactions.form.editTitle" : "transactions.form.title")}
        hideTitle
        footer={
          <Button
            type="button"
            onPress={() => transactionForm.submit(saveTransaction)}
            isDisabled={!transactionForm.canSave}
            className="bg-app-fg text-app-surface disabled:bg-app-fill-strong disabled:text-app-muted min-h-[54px] w-full rounded-2xl text-base font-semibold transition-[background-color,transform] active:scale-[0.98]"
          >
            <Check className="size-[17px]" strokeWidth={2.4} />
            {t("common.actions.save")}
          </Button>
        }
      >
        <div className="flex flex-col gap-4 pt-6 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <TransactionDateField
              key={isOpen ? "open" : "closed"}
              value={values.transactionDate}
              onChange={transactionForm.changeDate}
            />
            {isEditing ? null : (
              <TransactionRepeatField value={transactionForm.recurrence} onChange={transactionForm.changeRecurrence} />
            )}
          </div>

          <input
            value={values.description}
            onChange={(event) => transactionForm.changeDescription(event.target.value)}
            placeholder={t("transactions.form.descriptionPlaceholder")}
            maxLength={DESCRIPTION_MAX_LENGTH}
            autoComplete="off"
            aria-label={t("transactions.fields.description")}
            autoFocus
            className="font-display text-app-fg placeholder:text-app-muted/50 w-full border-0 bg-transparent text-[30px] leading-tight font-bold tracking-[-0.03em] outline-none"
          />

          <div className="flex items-center gap-3">
            <TransactionTypeToggle value={values.type} onChange={transactionForm.chooseType} />
            <TransactionAmountField
              type={values.type}
              currency={currency}
              rawAmount={transactionForm.rawAmount}
              onChange={transactionForm.changeAmount}
            />
          </div>

          <TransactionCategoryPicker
            categories={visibleCategoriesFor(categories, values.categoryId, isAutoCategory)}
            selectedId={values.categoryId}
            autoCategoryId={autoCategoryId}
            canCreate={!isAutoCategory}
            onCreate={startCreating}
            onToggle={transactionForm.toggleCategory}
          />

          <TransactionFormHint isAutoCategory={isAutoCategory} isCategoryMissing={isCategoryMissing} />
        </div>
      </Sheet>

      <CategoryFormSheet
        isOpen={isOpen && isCreating}
        initialName={firstWord(values.description)}
        onClose={stopCreating}
      />
    </>
  );
}
