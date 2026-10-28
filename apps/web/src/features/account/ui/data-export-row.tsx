"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncStatus } from "@/core/offline/sync-status";
import { useDataExport } from "../hooks/useDataExport";
import { exportHint } from "../lib/settings-hints";
import { SettingsRow } from "./settings-row";

interface DataExportRowProps {
  transactionCount: number;
  currencySymbol: string;
}

export function DataExportRow({ transactionCount, currencySymbol }: DataExportRowProps) {
  const t = useTranslations("settings.data");
  const { online: isOnline } = useSyncStatus();
  const { exportData, isExporting, hasFailed } = useDataExport(currencySymbol);
  const hint = exportHint({ isOnline, hasFailed, transactionCount });

  return (
    <SettingsRow
      label={t("label")}
      hint={t(hint.key, hint.values)}
      hintTone={hasFailed ? "danger" : "default"}
      hintRole={hasFailed ? "alert" : undefined}
    >
      <button
        type="button"
        onClick={exportData}
        disabled={!isOnline || isExporting}
        className="bg-app-fill hover:bg-app-fill-strong text-app-fg inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors disabled:opacity-50"
      >
        <Download className="size-3.5" strokeWidth={2.2} aria-hidden />
        {t(isExporting ? "exporting" : "export")}
      </button>
    </SettingsRow>
  );
}
