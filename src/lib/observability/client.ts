import type { PostHog } from "posthog-js";
import type { AnalyticsEvent, AnalyticsEvents } from "./events";

/*
 * Fachada de observabilidad del navegador. Los componentes sólo llaman a
 * estas funciones. Cada SDK se descarga con `import()` únicamente si su
 * clave existe: sin claves no hay coste en el bundle y todo es un no-op.
 * Las llamadas anteriores a la carga esperan a la promesa; ninguna lanza.
 */

type Sentry = typeof import("@sentry/nextjs");

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

const noop = () => {};
const isBrowser = typeof window !== "undefined";

let sentry: Promise<Sentry | null> | null = null;
let posthog: Promise<PostHog | null> | null = null;

function loadSentry() {
  if (!SENTRY_DSN || !isBrowser) return null;
  sentry ??= Promise.all([import("@sentry/nextjs"), import("./sentry")])
    .then(([sdk, { sentryOptions }]) => {
      sdk.init(sentryOptions(SENTRY_DSN));
      return sdk;
    })
    .catch(() => null);
  return sentry;
}

/**
 * Privacidad: sin autocapture (registraría el texto de lo que se pulsa:
 * importes, descripciones), sin grabaciones, sin heatmaps ni encuestas.
 * Sólo páginas vistas y los eventos explícitos de `events.ts`.
 */
function loadPosthog() {
  if (!POSTHOG_KEY || !isBrowser) return null;
  posthog ??= import("posthog-js")
    .then(({ default: client }) => {
      client.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: "history_change",
        capture_pageleave: "if_capture_pageview",
        autocapture: false,
        capture_heatmaps: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_performance: false,
        disable_session_recording: true,
        disable_surveys: true,
        advanced_disable_flags: true,
        disable_external_dependency_loading: true,
      });
      return client;
    })
    .catch(() => null);
  return posthog;
}

function withSentry(run: (sdk: Sentry) => void) {
  loadSentry()?.then((sdk) => sdk && run(sdk)).catch(noop);
}

function withPosthog(run: (client: PostHog) => void) {
  loadPosthog()?.then((client) => client && run(client)).catch(noop);
}

/** Desde `instrumentation-client.ts`: arranca la carga lo antes posible. */
export function initClientObservability() {
  loadSentry();
  loadPosthog();
}

export function track<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]) {
  withPosthog((client) => client.capture(event, properties));
}

/** Sólo el id interno: ni email ni nombre salen del dispositivo. */
export function identifyUser(userId: string) {
  withPosthog((client) => {
    if (client.get_distinct_id() !== userId) client.identify(userId);
  });
  withSentry((sdk) => sdk.setUser({ id: userId }));
}

/** Al cerrar sesión: la siguiente persona en el dispositivo es otra. */
export function resetUser() {
  withPosthog((client) => client.reset());
  withSentry((sdk) => sdk.setUser(null));
}

export function reportClientError(error: unknown) {
  withSentry((sdk) => sdk.captureException(error));
}

export function captureNavigation(href: string, navigationType: "push" | "replace" | "traverse") {
  withSentry((sdk) => sdk.captureRouterTransitionStart(href, navigationType));
}
