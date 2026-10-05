import type { AnalyticsEvent, AnalyticsEvents } from "./events";

/*
 * Puertos de observabilidad del servidor. La fachada (`server.ts`) sólo
 * conoce estas interfaces; cada proveedor (Sentry, PostHog…) es un
 * adaptador en `adapters/`, elegido por sus variables de entorno.
 */

export interface ErrorContext {
  userId?: string | null;
  extra: Record<string, unknown>;
}

export interface ErrorReporter {
  captureException(error: unknown, context: ErrorContext): void;
  /** Feature flag evaluado en esta petición, para adjuntarlo a sus errores. */
  recordFlag(slug: string, isOn: boolean): void;
}

export interface AnalyticsTracker {
  track<E extends AnalyticsEvent>(distinctId: string, event: E, properties: AnalyticsEvents[E]): Promise<void>;
}
