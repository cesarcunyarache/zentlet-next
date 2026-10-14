import { captureNavigation, initClientObservability } from "@/lib/observability/client";

// Sentry espera a que la página cargue; PostHog sólo con consentimiento
initClientObservability();

export const onRouterTransitionStart = captureNavigation;
