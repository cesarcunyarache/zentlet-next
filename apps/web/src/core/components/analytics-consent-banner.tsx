"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";
import { analyticsAvailable, type AnalyticsConsent } from "@/lib/observability/client";
import { useAnalyticsConsent } from "@/features/legal/hooks/useAnalyticsConsent";

/**
 * Pregunta una vez por dispositivo y versión de la política si se aceptan
 * las estadísticas de uso. Aceptar y rechazar pesan lo mismo; sin respuesta
 * no se carga nada. Sin analítica configurada no aparece.
 *
 * El aviso llega en el HTML y se pinta junto al resto de la página (si
 * apareciera al hidratar sería el LCP). Con respuesta vigente guardada,
 * `consentInitScript` lo oculta antes del primer pintado y al hidratar se desmonta.
 */
export function AnalyticsConsentBanner() {
  const t = useTranslations("common.analyticsConsent");
  const { consent, choose: saveConsent } = useAnalyticsConsent();

  if (!analyticsAvailable || consent !== null) return null;

  function choose(next: AnalyticsConsent) {
    saveConsent(next, "banner");
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("message")}
      className="bg-app-surface text-app-fg fixed [:root[data-consent-answered]_&]:hidden inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg rounded-2xl p-4 shadow-[var(--shadow-sheet)]"
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
