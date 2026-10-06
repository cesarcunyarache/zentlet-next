"use client";

import { useLocale, useTranslations } from "next-intl";
import { fullDate } from "@/lib/dates";
import { track } from "@/lib/observability/client";
import { useRecurringTransaction, useStopRecurringTransaction } from "@/features/recurring/stores/recurring.store";
import { useDeleteConfirmation } from "../../hooks/useDeleteConfirmation";

function stopLabelKey(isStopping: boolean, isConfirming: boolean) {
  if (isStopping) return "detail.stopping";
  return isConfirming ? "detail.confirmStop" : "detail.stop";
}

export function TransactionRecurrenceRow({ recurringTransactionId }: { recurringTransactionId: string }) {
  const t = useTranslations("transactions.repeat");
  const locale = useLocale();
  const { data: recurring } = useRecurringTransaction(recurringTransactionId);
  const stop = useStopRecurringTransaction();
  const { isConfirming, requestConfirmation } = useDeleteConfirmation(recurringTransactionId);

  if (stop.isSuccess) {
    return (
      <div className="border-app-border flex items-center justify-between gap-3 border-b px-0.5 py-[13px] text-sm">
        <dt className="text-app-muted m-0">{t("detail.label")}</dt>
        <dd className="text-app-muted m-0 text-right text-xs">{t("detail.stopped")}</dd>
      </div>
    );
  }
  if (!recurring) return null;

  function handleStop() {
    if (!isConfirming) return requestConfirmation();
    stop.mutate(recurringTransactionId, { onSuccess: () => track("recurring_stopped", {}) });
  }

  return (
    <div className="border-app-border flex flex-col gap-2 border-b px-0.5 py-[13px] text-sm">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-app-muted m-0">{t("detail.label")}</dt>
        <dd className="text-app-fg m-0 text-right font-semibold">
          {t("detail.next", {
            frequency: t(`options.${recurring.frequency}`),
            date: fullDate(recurring.nextDueDate, locale),
          })}
        </dd>
      </div>
      <button
        type="button"
        onClick={handleStop}
        disabled={stop.isPending}
        className="text-app-expense self-end text-xs font-semibold disabled:opacity-50"
      >
        {t(stopLabelKey(stop.isPending, isConfirming))}
      </button>
      {stop.isError ? (
        <p role="alert" className="text-app-expense m-0 text-xs">
          {t("detail.stopFailed")}
        </p>
      ) : null}
    </div>
  );
}
