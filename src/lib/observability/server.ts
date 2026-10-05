import { runInBackground } from "@/lib/background";
import { createPosthogTracker } from "./adapters/posthog";
import { sentryReporter } from "./adapters/sentry";
import type { AnalyticsEvent, AnalyticsEvents } from "./events";
import { logger } from "./logger";
import { withoutQueryData } from "./scrub";
import type { AnalyticsTracker, ErrorReporter } from "./types";

/*
 * Fachada de observabilidad del servidor. El resto del código sólo conoce
 * estas funciones, nunca a un proveedor. Cada uno se elige aquí por sus
 * variables de entorno; sin ellas no se carga ningún SDK y todo se reduce a
 * logs. Ninguna función lanza ni hace esperar a la petición del usuario.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

const errorReporter: ErrorReporter | null = process.env.SENTRY_DSN ? sentryReporter : null;
const analytics: AnalyticsTracker | null = POSTHOG_KEY ? createPosthogTracker(POSTHOG_KEY, POSTHOG_HOST) : null;

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
    errorReporter?.captureException(safeError, { userId, extra: { message, ...extra } });
  } catch {
    // la telemetría nunca rompe el flujo principal
  }
}

/** Evento de producto desde el servidor. Se envía después de responder. */
export function trackServerEvent<E extends AnalyticsEvent>(
  distinctId: string,
  event: E,
  properties: AnalyticsEvents[E],
) {
  if (!analytics) return;
  runInBackground(() => analytics.track(distinctId, event, properties));
}

/** Evaluación de un feature flag: se adjunta a los errores de esta petición. */
export function recordFlag(slug: string, isOn: boolean) {
  errorReporter?.recordFlag(slug, isOn);
}
