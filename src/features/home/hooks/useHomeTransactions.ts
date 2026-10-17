import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/observability/client";
import type { RecurrenceFrequency } from "@/features/recurring/types";
import type { TransactionFormValues } from "@/features/transaction/schemas/transaction.schema";
import { useTransactionMutations } from "@/features/transaction/stores/transaction.store";
import type { TTransaction } from "@/features/transaction/types";

interface UseHomeTransactionsOptions {
  listId: string | null;
  openForm: () => void;
  onCreated: () => void;
  toast: (message: string) => void;
}

export function useHomeTransactions({ listId, openForm, onCreated, toast }: UseHomeTransactionsOptions) {
  const t = useTranslations("transactions");
  const { createTransaction, updateTransaction, deleteTransaction } = useTransactionMutations();

  const [formDraft, setFormDraft] = useState<Partial<TransactionFormValues>>();
  const [editing, setEditing] = useState<TTransaction | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TTransaction | null>(null);

  function create(
    values: TransactionFormValues,
    recurrence: RecurrenceFrequency | null = null,
    targetListId: string | null = listId,
  ) {
    createTransaction({
      ...values,
      listId: targetListId,
      reference: null,
      recurrence: recurrence ?? undefined,
    });
    onCreated();

    const savedMessage = values.type === "expense" ? "toast.expenseSaved" : "toast.incomeSaved";
    toast(t(savedMessage));
  }

  function startCreating(draft?: Partial<TransactionFormValues>) {
    setFormDraft(draft);
    setEditing(null);
    openForm();
  }

  function startEditing(transaction: TTransaction) {
    const { description, amount, type, categoryId, transactionDate } = transaction;
    setFormDraft({ description, amount, type, categoryId, transactionDate });
    setEditing(transaction);
    openForm();
  }

  function submitForm(
    values: TransactionFormValues,
    recurrence: RecurrenceFrequency | null,
    targetListId: string | null,
  ) {
    if (editing) {
      updateTransaction(editing, values);
      toast(t("toast.updated"));
      return;
    }
    create(values, recurrence, targetListId);
  }

  function remove(transaction: TTransaction) {
    deleteTransaction(transaction);
    track("transaction_deleted", {});
    toast(t("toast.deleted"));
  }

  return {
    formDraft,
    isEditing: Boolean(editing),
    detailId,
    pendingDelete,
    create,
    startCreating,
    startEditing,
    submitForm,
    remove,
    showDetail: setDetailId,
    askToDelete: setPendingDelete,
  };
}
