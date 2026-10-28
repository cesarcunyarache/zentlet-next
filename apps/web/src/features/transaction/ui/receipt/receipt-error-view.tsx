"use client";

import { FileWarning, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReceiptError } from "../../lib/receipt/receipt-draft";
import { EntryErrorView } from "../entry/entry-error-view";

const ERROR_KEYS = {
  not_receipt: "notReceipt",
  invalid_image: "invalidImage",
  limited: "limited",
  failed: "failed",
  offline: "offline",
} as const satisfies Record<ReceiptError, string>;

interface ReceiptErrorViewProps {
  error: ReceiptError;
}

export function ReceiptErrorView({ error }: ReceiptErrorViewProps) {
  const t = useTranslations("transactions.receipt.errors");
  const key = ERROR_KEYS[error];

  return (
    <EntryErrorView
      icon={error === "offline" ? WifiOff : FileWarning}
      title={t(`${key}.title`)}
      body={t(`${key}.body`)}
    />
  );
}
