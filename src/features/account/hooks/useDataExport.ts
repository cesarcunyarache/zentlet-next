"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { track } from "@/lib/observability/client";
import { accountService } from "../services/account.service";
import { saveFile } from "../lib/save-file";
import { exportFileName } from "../lib/settings-hints";

type ExportStatus = "idle" | "exporting" | "failed";

export function useDataExport(currencySymbol: string) {
  const locale = useLocale();
  const [status, setStatus] = useState<ExportStatus>("idle");

  async function exportData() {
    setStatus("exporting");
    try {
      const file = await accountService.exportData({ locale, currency: currencySymbol });
      saveFile(file, exportFileName(new Date()));
      track("data_exported", {});
      setStatus("idle");
    } catch {
      setStatus("failed");
    }
  }

  return {
    exportData,
    isExporting: status === "exporting",
    hasFailed: status === "failed",
  };
}
