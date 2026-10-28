"use client";

import { ChevronRight, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { CategoryEmoji } from "@/features/category/ui/category-emoji";
import { formatSigned } from "@/lib/money";
import { useListName } from "../../hooks/useListName";
import { currencyOf, netTotal } from "../../lib/entries";
import type { TList } from "../../types";

interface ListCardProps {
  list: TList;
  onPress: () => void;
}

export function ListCard({ list, onPress }: ListCardProps) {
  const t = useTranslations("lists");
  const listName = useListName();
  const isShared = list.memberCount > 1;

  return (
    <button
      type="button"
      onClick={onPress}
      className="hover:bg-app-fill flex w-full items-center gap-3.5 rounded-2xl px-1 py-2.5 text-left transition-colors"
    >
      <CategoryEmoji category={list} className="size-12 rounded-2xl text-[22px]" />
      <span className="min-w-0 flex-1">
        <span className="text-app-fg block truncate text-base font-semibold tracking-[-0.01em]">{listName(list)}</span>
        <span className="text-app-muted flex items-center gap-1.5 text-xs">
          {t("count", { count: list.count })}
          {isShared ? (
            <>
              <span aria-hidden>·</span>
              <Users className="size-3" aria-hidden />
              {t("shared")}
            </>
          ) : null}
        </span>
      </span>
      <span className="num text-app-fg shrink-0 text-[15px] font-semibold">
        {formatSigned(netTotal(list), currencyOf(list.currency))}
      </span>
      <ChevronRight className="text-app-muted size-4 shrink-0" aria-hidden />
    </button>
  );
}
