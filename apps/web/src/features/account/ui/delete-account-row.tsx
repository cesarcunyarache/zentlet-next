"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { siteConfig } from "@/lib/site";
import { useLeaveApp } from "../hooks/useLeaveApp";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { SettingsButtonRow } from "./settings-row";

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
      <SettingsButtonRow
        label={t("label")}
        hint={t(isOnline ? "hint" : "offline")}
        labelTone="danger"
        onClick={() => setIsConfirming(true)}
        disabled={!isOnline}
        hasPopup
       
      />

      <DeleteAccountDialog
        isOpen={isConfirming}
        transactionCount={transactionCount}
        onCancel={() => setIsConfirming(false)}
        onDeleted={() => leaveApp(siteConfig.routes.home)}
      />
    </>
  );
}
