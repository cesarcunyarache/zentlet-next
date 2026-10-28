import type { FeatureFlagsIntegration } from "@sentry/nextjs";
import type { ErrorReporter } from "../types";

/*
 * Adaptador de Sentry. El SDK se carga bajo demanda: si no está
 * inicializado o falla al cargar, el error ya quedó en los logs.
 */

const noop = () => {};

export function withSentry(send: (sentry: typeof import("@sentry/nextjs")) => void) {
  import("@sentry/nextjs").then(send).catch(noop);
}

export const sentryReporter: ErrorReporter = {
  captureException(error, { userId, extra }) {
    withSentry((sentry) => sentry.captureException(error, { user: userId ? { id: userId } : undefined, extra }));
  },
  recordFlag(slug, isOn) {
    withSentry((sentry) =>
      sentry.getClient()?.getIntegrationByName<FeatureFlagsIntegration>("FeatureFlags")?.addFeatureFlag(slug, isOn),
    );
  },
};
