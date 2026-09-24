import type { init } from "@sentry/nextjs";
import { redactSearchQuery } from "./scrub";

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;

/**
 * Opciones comunes de Sentry para servidor y navegador. Sentry v11 recoge
 * por defecto cuerpos HTTP, cookies, cabeceras, parámetros de queries y
 * entradas de la IA: aquí todo eso se apaga, porque son datos financieros
 * del usuario. El usuario se identifica sólo por su id interno.
 */
export function sentryOptions(dsn: string): SentryOptions {
  return {
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1,
    // no reescribir los mensajes de `fetch` de la app: sólo el que se reporta
    enhanceFetchErrorMessages: "report-only",
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: { deny: ["q"] },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    beforeSend: (event) => redactSearchQuery(event),
    beforeSendSpan: (span) => redactSearchQuery(span),
    beforeBreadcrumb: (breadcrumb) => redactSearchQuery(breadcrumb),
  };
}
