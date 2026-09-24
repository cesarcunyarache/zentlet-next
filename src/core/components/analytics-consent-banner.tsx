"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import {
  analyticsAvailable,
  getAnalyticsConsent,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/observability/client";

/**
 * Pregunta una vez por dispositivo si se aceptan las estadísticas de uso.
 * Aceptar y rechazar pesan lo mismo; sin respuesta no se carga nada. Sin
 * analítica configurada no aparece.
 */
const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};
const hasAnswered = () => getAnalyticsConsent() !== null;
// en el servidor no hay almacenamiento: se asume respondido y no se pinta
const answeredOnServer = () => true;

export function AnalyticsConsentBanner() {
  const t = useTranslations("common.analyticsConsent");
  const answered = useSyncExternalStore(subscribe, hasAnswered, answeredOnServer);
  const [answeredNow, setAnsweredNow] = useState(false);

  if (!analyticsAvailable || answered || answeredNow) return null;

  function choose(consent: AnalyticsConsent) {
    setAnalyticsConsent(consent);
    setAnsweredNow(true);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("message")}
      className="bg-app-surface text-app-fg fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg rounded-2xl p-4 shadow-[var(--shadow-sheet)]"
    >
      <p className="text-app-muted m-0 text-[13px] leading-relaxed">
        {t("message")}{" "}
        <Link href={siteConfig.routes.privacy} className="text-app-fg underline underline-offset-2">
          {t("more")}
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose("denied")}
          className="bg-app-fill text-app-fg hover:bg-app-fill-strong min-h-10 flex-1 rounded-xl text-sm font-semibold"
        >
          {t("reject")}
        </button>
        <button
          type="button"
          onClick={() => choose("granted")}
          className="bg-app-fill text-app-fg hover:bg-app-fill-strong min-h-10 flex-1 rounded-xl text-sm font-semibold"
        >
          {t("accept")}
        </button>
      </div>
    </div>
  );
}
