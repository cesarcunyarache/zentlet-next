import { isAxiosError } from "axios";
import { getApiErrorMessage, getApiErrorStatus } from "@/core/services/api-error";
import { reportClientError } from "@/lib/observability/client";

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
 * - 429 (cupo de escrituras): se reintenta siempre, con espera creciente.
 *   Vaciar una cola larga sólo va más lento; nunca se descarta un cambio.
 * - 5xx: hasta 3 intentos.
 * - 4xx: el servidor rechazó el dato; repetir no lo arregla.
 * La idempotencia por id del servidor hace seguro repetir un alta.
 */
export function shouldRetryMutation(failureCount: number, error: unknown) {
  if (isNetworkError(error)) return true;
  const status = getApiErrorStatus(error);
  if (status === 429) return true;
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

/**
 * Una escritura que llega aquí se perdió: el cambio local se revierte. Los
 * fallos de red no llegan (se reintentan siempre), así que es un rechazo
 * real del servidor o un 5xx persistente. Se reporta un error propio y no
 * el de Axios, que lleva en `config.data` el contenido del movimiento.
 */
export function reportSyncFailure(operation: string, error: unknown) {
  const status = String(getApiErrorStatus(error) ?? "none");
  const failure = new Error(`Sync rejected: ${operation} (${status}): ${getApiErrorMessage(error)}`);
  failure.name = "SyncRejectedError";
  reportClientError(failure, {
    tags: { operation, status },
    fingerprint: ["sync-rejected", operation, status],
  });
}
