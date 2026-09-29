import type { AnalyticsEvents } from "@/lib/observability/events";
import { cleanAmountInput, dayShift, describeOrFallback, parseAmount, toISODate } from "../../lib/format";
import type { TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike } from "../../types";

export const MIN_SUGGESTION_LENGTH = 3;

const EMPTY_FORM_VALUES: TransactionFormValues = {
  description: "",
  amount: 0,
  type: "expense",
  categoryId: "",
  transactionDate: "",
};

export function initialFormValues(draft?: Partial<TransactionFormValues>): TransactionFormValues {
  return { ...EMPTY_FORM_VALUES, transactionDate: toISODate(dayShift(0)), ...draft };
}

export function initialRawAmount(draft?: Partial<TransactionFormValues>) {
  return draft?.amount ? String(draft.amount) : "";
}

export function readAmountInput(input: string) {
  const raw = cleanAmountInput(input.replace(/,/g, ""));
  return { raw, value: parseAmount(raw) };
}

export function normalizeSuggestionText(text: string) {
  return text.trim().toLowerCase();
}

export function isAutoSelectedCategory(autoCategoryId: string | null, categoryId: string) {
  return Boolean(autoCategoryId) && autoCategoryId === categoryId;
}

export function visibleCategoriesFor(categories: CategoryLike[], categoryId: string, isAutoCategory: boolean) {
  return isAutoCategory ? categories.filter((category) => category.id === categoryId) : categories;
}

interface MissingCategoryHintInput {
  categoryId: string;
  description: string;
  isThinking: boolean;
}

export function shouldHintMissingCategory({ categoryId, description, isThinking }: MissingCategoryHintInput) {
  return !categoryId && description.trim().length >= MIN_SUGGESTION_LENGTH && !isThinking;
}

export function firstWord(text: string) {
  return text.trim().split(/\s+/)[0] ?? "";
}

export function findCreatedCategory(categories: CategoryLike[], knownIds: Set<string>) {
  return categories.find((category) => !knownIds.has(category.id));
}

export function finalizeFormValues(
  values: TransactionFormValues,
  categories: CategoryLike[],
  defaultDescription: string,
): TransactionFormValues {
  const category = categories.find((c) => c.id === values.categoryId);
  return {
    ...values,
    description: describeOrFallback(values.description.trim(), category?.name, defaultDescription),
  };
}

export function transactionUpdatedPayload(
  values: TransactionFormValues,
  draft?: Partial<TransactionFormValues>,
): AnalyticsEvents["transaction_updated"] {
  return {
    category_changed: values.categoryId !== draft?.categoryId,
    type_changed: values.type !== draft?.type,
  };
}

export function transactionCreatedPayload(
  values: TransactionFormValues,
  draft: Partial<TransactionFormValues> | undefined,
  autoCategoryId: string | null,
): AnalyticsEvents["transaction_created"] {
  return {
    source: draft ? "voice" : "form",
    type: values.type,
    category_auto: autoCategoryId !== null && autoCategoryId === values.categoryId,
  };
}
