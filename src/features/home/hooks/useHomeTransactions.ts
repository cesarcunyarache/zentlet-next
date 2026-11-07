import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/observability/client";
import { useListName } from "@/features/list/hooks/useListName";
import { listErrorKey } from "@/features/list/lib/errors";
import { useAddToList, useLists } from "@/features/list/stores/list.store";
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
  const tLists = useTranslations("lists");
  const listName = useListName();
  const { lists } = useLists();
  const addToList = useAddToList();
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

  function moveToList(transaction: TTransaction, targetListId: string) {
    const target = lists.find((list) => list.id === targetListId);
    if (!target) return;
    addToList.mutate(
      { listId: target.id, transactionIds: [transaction.id] },
      {
        onSuccess: () => {
          track("list_entries_added", { count: 1, source: "transaction" });
          toast(tLists("toast.moved", { name: listName(target) }));
        },
        onError: (cause) => toast(tLists(`errors.${listErrorKey(cause)}`, { currency: target.currency })),
      },
    );
  }

  function submitForm(
    values: TransactionFormValues,
    recurrence: RecurrenceFrequency | null,
    targetListId: string | null,
  ) {
    if (editing) {
      updateTransaction(editing, values);
      toast(t("toast.updated"));
      if (targetListId && targetListId !== editing.listId) moveToList(editing, targetListId);
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
    editingListId: editing?.listId ?? null,
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
