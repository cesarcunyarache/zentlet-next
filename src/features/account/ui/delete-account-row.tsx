"use client";

import { useState } from "react";
import { UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { siteConfig } from "@/lib/site";
import { useLeaveApp } from "../hooks/useLeaveApp";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { SettingsRowText } from "./settings-row";

interface DeleteAccountRowProps {
  transactionCount: number;
}

export function DeleteAccountRow({ transactionCount }: DeleteAccountRowProps) {
  const t = useTranslations("settings.deleteAccount");
  const { online: isOnline } = useSyncStatus();
  const leaveApp = useLeaveApp();
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        disabled={!isOnline}
        className="border-app-border flex w-full items-center justify-between gap-3.5 border-t py-3.5 text-left disabled:opacity-50"
      >
        <SettingsRowText label={t("label")} hint={t(isOnline ? "hint" : "offline")} labelTone="danger" />
        <UserX className="text-app-expense size-4 shrink-0" aria-hidden />
      </button>

      <DeleteAccountDialog
        isOpen={isConfirming}
        transactionCount={transactionCount}
        onCancel={() => setIsConfirming(false)}
        onDeleted={() => leaveApp(siteConfig.routes.home)}
      />
    </>
  );
}
