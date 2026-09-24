import { after } from "next/server";
import type { Instrumentation } from "next";
import { logger } from "./logger";
import type { AnalyticsEvent, AnalyticsEvents } from "./events";
import { withoutQueryData } from "./scrub";

/*
 * Fachada de observabilidad del servidor. El resto del código sólo conoce
 * estas funciones, nunca a Sentry ni a PostHog. Sin sus variables de
 * entorno no se carga ningún SDK y todo se reduce a logs. Ninguna función
 * lanza ni hace esperar a la petición del usuario.
 */

const SENTRY_ENABLED = Boolean(process.env.SENTRY_DSN);
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_TIMEOUT_MS = 2_000;

const noop = () => {};

function withSentry(send: (sentry: typeof import("@sentry/nextjs")) => void) {
  if (!SENTRY_ENABLED) return;
  import("@sentry/nextjs").then(send).catch(noop);
}

/** Ruta sin query string: la búsqueda (`?q=`) es texto libre del usuario. */
function pathOnly(url: string) {
  return url.split("?")[0];
}

/** Error manejado (se respondió al usuario, p. ej. con un 500). */
export function reportError(
  error: unknown,
  message: string,
  context: { userId?: string | null } & Record<string, unknown> = {},
) {
  try {
    const { userId, ...extra } = context;
    const safeError = withoutQueryData(error);
    logger.error({ err: safeError, userId, ...extra }, message);
    withSentry((sentry) =>
      sentry.captureException(safeError, {
        user: userId ? { id: userId } : undefined,
        extra: { message, ...extra },
      }),
    );
  } catch {
    // la telemetría nunca rompe el flujo principal
  }
}

/** Error que Next no pudo manejar (render, Route Handler o Server Action). */
export function reportRequestError(...[rawError, request, context]: Parameters<Instrumentation.onRequestError>) {
  try {
    const error = withoutQueryData(rawError);
    logger.error(
      {
        err: error,
        method: request.method,
        path: pathOnly(request.path),
        routePath: context.routePath,
        routeType: context.routeType,
      },
      "request.unhandled_error",
    );
    withSentry((sentry) => sentry.captureRequestError(error, { ...request, path: pathOnly(request.path) }, context));
  } catch {
    // idem
  }
}

/**
 * Evento de producto desde el servidor. Se envía después de responder
 * (`after`), con timeout: PostHog caído no retrasa ni rompe nada.
 */
export function trackServerEvent<E extends AnalyticsEvent>(
  distinctId: string,
  event: E,
  properties: AnalyticsEvents[E],
) {
  if (!POSTHOG_KEY) return;

  const send = () =>
    fetch(`${POSTHOG_HOST}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(POSTHOG_TIMEOUT_MS),
    })
      .then((response) => {
        if (!response.ok) logger.warn({ event, status: response.status }, "analytics.rejected");
      })
      .catch((error: unknown) => logger.warn({ event, err: error }, "analytics.unavailable"));

  try {
    after(send);
  } catch {
    // fuera de una petición (scripts, tests) `after` no está disponible
    void send();
  }
}
