"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

/*
 * CAPTCHA de Cloudflare Turnstile para las pantallas de acceso. Casi
 * siempre es invisible: sólo pide una interacción si el tráfico parece
 * automatizado. Sin `NEXT_PUBLIC_TURNSTILE_SITE_KEY` no se carga nada y los
 * formularios funcionan como siempre (el servidor tampoco lo exige).
 */

interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let script: Promise<void> | null = null;

function loadScript() {
  script ??= new Promise<void>((resolve, reject) => {
    const element = document.createElement("script");
    element.src = SCRIPT_URL;
    element.async = true;
    element.onload = () => resolve();
    element.onerror = () => {
      script = null;
      reject(new Error("Turnstile unavailable"));
    };
    document.head.appendChild(element);
  });
  return script;
}

export function useTurnstile() {
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          language: locale,
          theme: "auto",
          callback: (value: string) => setToken(value),
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [locale]);

  return {
    /** Se puede enviar: sin CAPTCHA configurado, siempre. */
    ready: !SITE_KEY || token !== null,
    /** Cabecera que Better Auth comprueba en el servidor. */
    headers: token ? { "x-captcha-response": token } : undefined,
    widget: SITE_KEY ? <div ref={container} className="flex min-h-[65px] justify-center" /> : null,
    /** Cada token sirve una vez: tras un intento (bien o mal) se pide otro. */
    reset() {
      setToken(null);
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    },
  };
}
