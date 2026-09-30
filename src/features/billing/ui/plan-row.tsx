"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { SettingsRow } from "@/features/account/ui/settings-row";
import { useBillingActions } from "../hooks/useBillingActions";
import { planAction, planHint } from "../lib/plan-hint";
import { useBillingSummary } from "../stores/billing.store";
import type { BillingSummary } from "../types";
import { UpgradeButton } from "./upgrade-button";

const CENTS = 100;

interface CancelButtonProps {
  isConfirming: boolean;
  isWorking: boolean;
  onPress: () => void;
}

function useHintText(summary: BillingSummary, hasFailed: boolean) {
  const t = useTranslations("billing.plan");
  const format = useFormatter();
  if (hasFailed) return t("failed");

  const { key, date } = planHint(summary);
  const price = format.number(summary.price.amount / CENTS, {
    style: "currency",
    currency: summary.price.currency,
  });
  const formattedDate = date ? format.dateTime(new Date(date), { day: "numeric", month: "long" }) : "";
  return t(key, { price, date: formattedDate });
}

function CancelButton({ isConfirming, isWorking, onPress }: CancelButtonProps) {
  const t = useTranslations("billing.actions");
  const { online: isOnline } = useSyncStatus();

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!isOnline || isWorking}
      data-confirming={isConfirming}
      className="bg-app-fill hover:bg-app-fill-strong data-[confirming=true]:bg-app-expense data-[confirming=true]:text-app-surface text-app-fg inline-flex min-h-[30px] shrink-0 items-center rounded-full px-3 text-[13px] font-semibold transition-colors disabled:opacity-50"
    >
      {t(isWorking ? "working" : isConfirming ? "confirmCancel" : "cancel")}
    </button>
  );
}

function PlanRowContent({ summary }: { summary: BillingSummary }) {
  const t = useTranslations("billing.plan");
  const { upgrade, cancel, isWorking, isConfirming, hasFailed } = useBillingActions();
  const hint = useHintText(summary, hasFailed);
  const isDanger = hasFailed || summary.status === "past_due";

  return (
    <SettingsRow
      label={t("label")}
      hint={hint}
      hintTone={isDanger ? "danger" : "default"}
      hintRole={hasFailed ? "alert" : undefined}
    >
      {planAction(summary) === "cancel" ? (
        <CancelButton isConfirming={isConfirming} isWorking={isWorking} onPress={cancel} />
      ) : (
        <UpgradeButton isTrialEligible={summary.isTrialEligible} isWorking={isWorking} onPress={upgrade} />
      )}
    </SettingsRow>
  );
}

export function PlanRow() {
  const { summary } = useBillingSummary();
  return summary ? <PlanRowContent summary={summary} /> : null;
}
