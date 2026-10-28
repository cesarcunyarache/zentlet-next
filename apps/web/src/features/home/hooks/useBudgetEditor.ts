import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CategoryLike } from "@/features/transaction/types";

export function useBudgetEditor(toast: (message: string) => void) {
  const t = useTranslations("budgets.toast");
  const [category, setCategory] = useState<CategoryLike | null>(null);

  function close() {
    setCategory(null);
  }

  function saved() {
    close();
    toast(t("saved"));
  }

  function removed() {
    close();
    toast(t("removed"));
  }

  return { category, open: setCategory, close, saved, removed };
}
