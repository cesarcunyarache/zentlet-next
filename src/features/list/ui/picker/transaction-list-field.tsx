"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLists } from "../../stores/list.store";

interface TransactionListFieldProps {
  listId: string | null | undefined;
  onPress: () => void;
}

export function TransactionListField({ listId, onPress }: TransactionListFieldProps) {
  const t = useTranslations("lists.picker");
  const { lists } = useLists();
  const current = listId ? lists.find((list) => list.id === listId) : undefined;

  return (
    <div className="border-app-border border-b text-sm">
      <dt className="sr-only">{t("label")}</dt>
      <dd className="m-0">
        <button
          type="button"
          onClick={onPress}
          className="flex w-full items-center justify-between gap-3 px-0.5 py-[13px] text-left"
        >
          <span className="text-app-muted">{t("label")}</span>
          <span className="text-app-fg flex min-w-0 items-center gap-1 font-semibold">
            <span className="truncate">{current ? `${current.icon} ${current.name}` : t("none")}</span>
            <ChevronRight className="text-app-muted size-4 shrink-0" aria-hidden />
          </span>
        </button>
      </dd>
    </div>
  );
}
