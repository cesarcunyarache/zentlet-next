"use client";

import { useTranslations } from "next-intl";
import type { TTransaction } from "@/features/transaction/types";
import { track } from "@/lib/observability/client";
import { useListName } from "../../hooks/useListName";
import { listErrorKey } from "../../lib/errors";
import { useAddToList, useLists } from "../../stores/list.store";
import { ListSelect } from "./list-select";

interface TransactionListFieldProps {
  transaction: TTransaction | null;
  onMessage: (message: string) => void;
}

export function TransactionListField({ transaction, onMessage }: TransactionListFieldProps) {
  const t = useTranslations("lists");
  const { lists } = useLists();
  const listName = useListName();
  const add = useAddToList();

  function handleChange(listId: string) {
    const target = lists.find((list) => list.id === listId);
    if (!transaction || !target || listId === transaction.listId) return;
    add.mutate(
      { listId: target.id, transactionIds: [transaction.id] },
      {
        onSuccess: () => {
          track("list_entries_added", { count: 1, source: "transaction" });
          onMessage(t("toast.moved", { name: listName(target) }));
        },
        onError: (cause) => onMessage(t(`errors.${listErrorKey(cause)}`, { currency: target.currency })),
      },
    );
  }

  return (
    <div className="border-app-border flex items-center justify-between gap-3 border-b py-1.5 pl-0.5 text-sm">
      <dt className="text-app-muted m-0 shrink-0">{t("picker.label")}</dt>
      <dd className="m-0 min-w-0">
        <ListSelect
          value={transaction?.listId ?? null}
          onChange={handleChange}
          isPending={add.isPending}
          className="-mr-2.5 max-w-full text-sm"
        />
      </dd>
    </div>
  );
}
