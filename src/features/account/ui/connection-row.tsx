"use client";

import { CloudOff } from "lucide-react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { connectionHint } from "../lib/settings-hints";
import { SettingsRowText } from "./settings-row";

export function ConnectionRow() {
  const t = useTranslations("settings.connection");
  const { online: isOnline, pendingCount, syncingCount } = useSyncStatus();
  const hint = connectionHint({ isOnline, pendingCount, syncingCount });

  return (
    <div role="status" aria-live="polite" className="border-app-border border-b py-3.5">
      <div className="flex items-center justify-between gap-3.5">
        <SettingsRowText label={t("label")} hint={t(hint.key, hint.values)} />
        <ConnectionBadge isOnline={isOnline} label={t(isOnline ? "online" : "offline")} />
      </div>

      {!isOnline && <OfflineNotice title={t("offlineTitle")} body={t("offlineBody")} />}
    </div>
  );
}

function ConnectionBadge({ isOnline, label }: { isOnline: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[28px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
        isOnline ? "bg-app-income-soft text-app-income" : "bg-app-expense-soft text-app-expense",
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", isOnline ? "bg-app-income" : "bg-app-expense")} />
      {label}
    </span>
  );
}

function OfflineNotice({ title, body }: { title: string; body: string }) {
  return (
    <p className="bg-app-fill text-app-fg mt-3 flex gap-2.5 rounded-2xl p-3 text-xs leading-relaxed">
      <CloudOff className="text-app-expense mt-px size-4 shrink-0" aria-hidden />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-app-muted">{body}</span>
      </span>
    </p>
  );
}
