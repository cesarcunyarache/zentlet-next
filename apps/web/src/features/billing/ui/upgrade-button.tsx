"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@heroui/react";
import { useSyncStatus } from "@/core/offline/sync-status";
import { useBillingActions } from "../hooks/useBillingActions";
import { TRIAL_DAYS } from "../lib/plans";
import { useBillingSummary } from "../stores/billing.store";

interface UpgradeButtonProps {
  isTrialEligible: boolean;
  isWorking: boolean;
  onPress: () => void;
  className?: string;
}

export function UpgradeButton({ isTrialEligible, isWorking, onPress, className }: UpgradeButtonProps) {
  const t = useTranslations("billing.actions");
  const { online: isOnline } = useSyncStatus();
  const label = isTrialEligible ? t("startTrial", { days: TRIAL_DAYS }) : t("upgrade");

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={!isOnline || isWorking}
      className={cn(
        "bg-app-fg text-app-surface inline-flex min-h-[30px] shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold disabled:opacity-50",
        className,
      )}
    >
      <Sparkles className="size-3.5" strokeWidth={2.2} aria-hidden />
      {isWorking ? t("working") : label}
    </button>
  );
}

export function UpgradePrompt({ className }: { className?: string }) {
  const { summary } = useBillingSummary();
  const { upgrade, isWorking } = useBillingActions();

  return (
    <UpgradeButton
      isTrialEligible={summary?.isTrialEligible ?? false}
      isWorking={isWorking}
      onPress={upgrade}
      className={className}
    />
  );
}
