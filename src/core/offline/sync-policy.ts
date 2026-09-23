import { isAxiosError } from "axios";
import { getApiErrorStatus } from "@/core/services/api-error";

/*
 * Reglas de sincronización compartidas por todas las mutaciones offline.
 */

/**
 * Todas las escrituras comparten un único scope: TanStack Query las ejecuta
 * de una en una y en orden. Así una categoría creada sin conexión llega al
 * servidor antes que el movimiento que la usa.
 */
export const SYNC_SCOPE = { id: "zentlet-sync" } as const;

/** Sin respuesta del servidor: sin red, DNS, timeout, servidor caído. */
export function isNetworkError(error: unknown) {
  return isAxiosError(error) && !error.response;
}

/**
 * - Red: se reintenta siempre. Sin conexión el reintento queda en pausa y
 *   continúa solo al volver la red; no se pierde nada.
 * - 5xx: hasta 3 intentos.
 * - 4xx: el servidor rechazó el dato; repetir no lo arregla.
 * La idempotencia por id del servidor hace seguro repetir un alta.
 */
export function shouldRetryMutation(failureCount: number, error: unknown) {
  if (isNetworkError(error)) return true;
  const status = getApiErrorStatus(error);
  if (status && status >= 500) return failureCount < 3;
  return false;
}

/** Espera entre reintentos: 1 s, 2 s, 4 s… hasta 30 s. */
export function mutationRetryDelay(failureCount: number) {
  return Math.min(1000 * 2 ** failureCount, 30_000);
}

/** 404 al borrar = ya no existe: el objetivo de la operación se cumplió. */
export function isNotFound(error: unknown) {
  return getApiErrorStatus(error) === 404;
}
