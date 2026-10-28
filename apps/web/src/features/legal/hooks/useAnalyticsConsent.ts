import { useCallback, useSyncExternalStore } from "react";
import {
  CONSENT_CHANGE_EVENT,
  getAnalyticsConsent,
  getVisitorId,
  setAnalyticsConsent,
  type AnalyticsConsent,
} from "@/lib/observability/client";
import { COOKIE_POLICY_VERSION, type CookieConsentSource } from "../config";
import { cookieConsentService } from "../services/cookie-consent.service";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  };
};

const unansweredOnServer = () => null;

export function useAnalyticsConsent() {
  const consent = useSyncExternalStore(subscribe, getAnalyticsConsent, unansweredOnServer);

  const choose = useCallback((next: AnalyticsConsent, source: CookieConsentSource) => {
    setAnalyticsConsent(next);
    cookieConsentService
      .record({
        visitorId: getVisitorId(),
        granted: next === "granted" ? ["analytics"] : [],
        policyVersion: COOKIE_POLICY_VERSION,
        source,
      })
      .catch(() => {});
  }, []);

  return { consent, choose };
}
