"use client";

import { useCookieConsentSync } from "../hooks/useCookieConsentSync";

export function CookieConsentSync({ userId }: { userId: string }) {
  useCookieConsentSync(userId);
  return null;
}
