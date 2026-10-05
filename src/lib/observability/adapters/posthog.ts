import { logger } from "../logger";
import type { AnalyticsTracker } from "../types";

/** Adaptador de PostHog por su API HTTP, con timeout: caído no retrasa ni rompe nada. */

const TIMEOUT_MS = 2_000;

export function createPosthogTracker(apiKey: string, host: string): AnalyticsTracker {
  return {
    async track(distinctId, event, properties) {
      try {
        const response = await fetch(`${host}/i/v0/e/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            event,
            distinct_id: distinctId,
            properties,
            timestamp: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) logger.warn({ event, status: response.status }, "analytics.rejected");
      } catch (error) {
        logger.warn({ event, err: error }, "analytics.unavailable");
      }
    },
  };
}
