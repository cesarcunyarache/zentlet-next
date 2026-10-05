import { useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/observability/client";
import { isDraftEdited, toAcceptValues, toInboxDraft, type InboxDraft } from "../lib/review-draft";
import { useAcceptInboxItem, useDismissInboxItem } from "../stores/inbox.store";
import type { TInboxItem } from "../types";

export function useInboxItemReview(item: TInboxItem) {
  const t = useTranslations("transactions");
  const [draft, setDraft] = useState<InboxDraft>(() => toInboxDraft(item));
  const accept = useAcceptInboxItem();
  const dismiss = useDismissInboxItem();
  const values = toAcceptValues(item, draft, t("defaultDescription"));

  function update(patch: Partial<InboxDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function confirm() {
    if (!values) return;
    accept.mutate({ id: item.id, values });
    track("inbox_item_accepted", { edited: isDraftEdited(item, draft), learned: item.isLearned });
    track("transaction_created", { source: "email", type: values.type, category_auto: draft.categoryId === item.categoryId });
  }

  function discard() {
    dismiss.mutate(item.id);
    track("inbox_item_dismissed", { duplicate: item.duplicateOfId !== null });
  }

  return {
    draft,
    update,
    canAccept: values !== null,
    isWorking: accept.isPending || dismiss.isPending,
    hasFailed: accept.isError,
    confirm,
    discard,
  };
}
