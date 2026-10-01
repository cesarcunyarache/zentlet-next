import type { Instrumentation } from "next";
import { withSentry } from "./adapters/sentry";
import { logger } from "./logger";
import { withoutQueryData } from "./scrub";

/*
 * Pegamento con Next: errores que el framework no pudo manejar (render,
 * Route Handler o Server Action), recibidos en `onRequestError`. En un
 * backend dedicado su equivalente es el filtro de excepciones global.
 */

/** Ruta sin query string: la búsqueda (`?q=`) es texto libre del usuario. */
function pathOnly(url: string) {
  return url.split("?")[0];
}

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
    if (!process.env.SENTRY_DSN) return;
    withSentry((sentry) => sentry.captureRequestError(error, { ...request, path: pathOnly(request.path) }, context));
  } catch {
    // la telemetría nunca rompe el flujo principal
  }
}
