import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TransactionSuggestion } from "../../ai/schemas/transaction-ai.schema";
import { readDescription } from "../../lib/parse-description";
import { transactionSchema, type TransactionFormValues } from "../../schemas/transaction.schema";
import type { CategoryLike, TransactionType } from "../../types";
import { initialFormValues, initialRawAmount, readAmountInput } from "../../lib/transaction-form";
import { useCategorySuggestion } from "./useCategorySuggestion";

interface UseTransactionFormOptions {
  isOpen: boolean;
  draft?: Partial<TransactionFormValues>;
  categories: CategoryLike[];
}

export function useTransactionForm({ isOpen, draft, categories }: UseTransactionFormOptions) {
  const [rawAmount, setRawAmount] = useState("");
  const [autoCategoryId, setAutoCategoryId] = useState<string | null>(null);
  const manualChoices = useRef({ category: false, type: false });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode: "onChange",
    defaultValues: initialFormValues(),
  });

  const type = form.watch("type");
  const categoryId = form.watch("categoryId");
  const transactionDate = form.watch("transactionDate");
  const amount = form.watch("amount");
  const description = form.watch("description");

  const resetForOpening = useEffectEvent(() => {
    setRawAmount(initialRawAmount(draft));
    setAutoCategoryId(null);
    manualChoices.current = { category: Boolean(draft?.categoryId), type: Boolean(draft?.type) };
    form.reset(initialFormValues(draft));
    if (draft) void form.trigger();
  });

  useEffect(() => {
    if (isOpen) resetForOpening();
  }, [isOpen]);

  function applyAutoCategory(id: string | null) {
    if (!id || manualChoices.current.category) return;
    form.setValue("categoryId", id, { shouldValidate: true });
    setAutoCategoryId(id);
  }

  function applyAutoType(next: TransactionType | null) {
    if (!next || manualChoices.current.type) return;
    form.setValue("type", next);
  }

  const isThinking = useCategorySuggestion({
    description,
    isEnabled: isOpen,
    categories,
    onSuggestion: (suggestion: TransactionSuggestion) => {
      applyAutoCategory(suggestion.categoryId);
      applyAutoType(suggestion.type);
    },
  });

  function submit(onValid: (values: TransactionFormValues) => void) {
    return form.handleSubmit(onValid)();
  }

  function changeDescription(value: string) {
    form.setValue("description", value, { shouldValidate: true });
    const hints = readDescription(value, categories);
    applyAutoType(hints.type);
    applyAutoCategory(hints.categoryId);
  }

  function changeAmount(input: string) {
    const { raw, value } = readAmountInput(input);
    setRawAmount(raw);
    form.setValue("amount", value, { shouldValidate: true, shouldDirty: true });
  }

  function changeDate(date: string) {
    form.setValue("transactionDate", date, { shouldValidate: true });
  }

  function chooseType(kind: TransactionType) {
    manualChoices.current.type = true;
    form.setValue("type", kind);
  }

  function toggleCategory(id: string) {
    manualChoices.current.category = true;
    setAutoCategoryId(null);
    form.setValue("categoryId", categoryId === id ? "" : id, { shouldValidate: true });
  }

  function selectCategory(id: string) {
    manualChoices.current.category = true;
    form.setValue("categoryId", id, { shouldValidate: true });
  }

  return {
    values: { type, categoryId, transactionDate, amount, description },
    canSave: form.formState.isValid && amount > 0,
    rawAmount,
    autoCategoryId,
    isThinking,
    submit,
    changeDescription,
    changeAmount,
    changeDate,
    chooseType,
    toggleCategory,
    selectCategory,
  };
}
