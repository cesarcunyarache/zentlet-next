import { logger } from "@/lib/observability/logger";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Llamadas al modelo por usuario y minuto, compartidas entre todas las
 * operaciones de IA. El uso normal (sugerencias con debounce y cache en el
 * cliente) queda muy por debajo.
 */
const AI_CALLS_PER_MINUTE = 30;
const WINDOW_MS = 60_000;

/** `false` si el usuario agotó su cupo: no se llama al modelo. */
export async function allowAiCall(userId: string, operation: string) {
  const { allowed, count } = await rateLimit(`ai:${userId}`, AI_CALLS_PER_MINUTE, WINDOW_MS);
  // un aviso por ventana, no uno por llamada rechazada
  if (count === AI_CALLS_PER_MINUTE + 1) logger.warn({ userId, operation }, "ai.rate_limited");
  return allowed;
}
