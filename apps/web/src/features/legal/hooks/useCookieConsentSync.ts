import { useEffect } from "react";
import {
  analyticsAvailable,
  getAnalyticsConsent,
  getVisitorId,
  setAnalyticsConsent,
} from "@/lib/observability/client";
import { COOKIE_POLICY_VERSION } from "../config";
import { cookieConsentService } from "../services/cookie-consent.service";

export function useCookieConsentSync(userId: string) {
  useEffect(() => {
    if (!analyticsAvailable) return;
    let active = true;

    cookieConsentService
      .sync(getVisitorId())
      .then((remote) => {
        if (!active || getAnalyticsConsent() !== null) return;
        if (remote?.policyVersion !== COOKIE_POLICY_VERSION) return;
        setAnalyticsConsent(remote.granted.includes("analytics") ? "granted" : "denied");
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [userId]);
}
