import { captureNavigation, initClientObservability } from "@/lib/observability/client";

// antes de hidratar; los SDK se descargan en paralelo y sin bloquear
initClientObservability();

export const onRouterTransitionStart = captureNavigation;
