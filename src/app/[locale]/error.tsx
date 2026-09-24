"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { StatusPage } from "@/core/components/status-page";
import { reportClientError } from "@/lib/observability/client";

/** Error al pintar una pantalla: se reporta y se puede reintentar sin recargar. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common.error");

  useEffect(() => reportClientError(error), [error]);

  return (
    <StatusPage title={t("title")} body={t("body")} home={t("home")}>
      <button
        type="button"
        onClick={reset}
        className="bg-app-fill text-app-fg hover:bg-app-fill-strong inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold"
      >
        {t("retry")}
      </button>
    </StatusPage>
  );
}
