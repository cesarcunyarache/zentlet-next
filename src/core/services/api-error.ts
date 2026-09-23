import { isAxiosError } from "axios";

/**
 * Estrategia de errores: los servicios dejan propagar el `AxiosError` tal
 * cual (no se transforma ni se envuelve). Esta función es el único punto
 * donde la UI lo traduce a un texto legible.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado",
): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

/** Código HTTP del error, si lo hay. Útil para decidir reintentos. */
export function getApiErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}
