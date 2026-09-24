import type { Instrumentation } from "next";

/*
 * Arranque de la observabilidad del servidor (Next lo ejecuta una vez,
 * antes de atender peticiones). Sin `SENTRY_DSN` no se carga Sentry.
 * Con él, Sentry instala OpenTelemetry: HTTP, queries de `pg` y los spans
 * del AI SDK llegan como trazas sin tocar el código de negocio.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (process.env.NEXT_RUNTIME !== "nodejs" || !dsn) return;

  try {
    const [Sentry, { sentryOptions }] = await Promise.all([
      import("@sentry/nextjs"),
      import("./lib/observability/sentry"),
    ]);
    Sentry.init(sentryOptions(dsn));
  } catch (error) {
    // sin telemetría la app sigue funcionando
    console.error("observability: Sentry init failed", error);
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { reportRequestError } = await import("./lib/observability/server");
    reportRequestError(...args);
  } catch {
    // nunca propagar un fallo de la telemetría
  }
};
