"use client";

import { useTranslations } from "next-intl";
import type { TTransaction } from "@/features/transaction/types";
import { useListName } from "../../hooks/useListName";
import { useLists } from "../../stores/list.store";

interface TransactionListRowProps {
  transaction: TTransaction | null;
}

export function TransactionListRow({ transaction }: TransactionListRowProps) {
  const t = useTranslations("lists");
  const { lists } = useLists();
  const listName = useListName();
  const list = lists.find((item) => item.id === transaction?.listId);

  if (!list) return null;

  return (
    <div className="border-app-border flex items-center justify-between gap-3 border-b px-0.5 py-[13px] text-sm">
      <dt className="text-app-muted m-0 shrink-0">{t("picker.label")}</dt>
      <dd className="text-app-fg m-0 min-w-0 truncate text-right font-semibold">{listName(list)}</dd>
    </div>
  );
}
