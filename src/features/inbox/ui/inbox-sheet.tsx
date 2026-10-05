"use client";

import { useTranslations } from "next-intl";
import { Sheet } from "@/core/components/ui/sheet";
import type { CategoryBase } from "@/features/category/types";
import { useInboxItems } from "../stores/inbox.store";
import { InboxItemCard } from "./inbox-item-card";

interface InboxSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  categories: CategoryBase[];
}

export function InboxSheet({ isOpen, onOpenChange, currency, categories }: InboxSheetProps) {
  const t = useTranslations("inbox");
  const { items } = useInboxItems();

  return (
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={t("title")}>
      <p className="text-app-muted m-0 pb-3 text-sm">{t("intro")}</p>
      {items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-3 p-0 pb-2">
          {items.map((item) => (
            <InboxItemCard key={item.id} item={item} currency={currency} categories={categories} />
          ))}
        </ul>
      ) : (
        <p className="text-app-muted py-10 text-center text-sm">{t("empty")}</p>
      )}
    </Sheet>
  );
}
