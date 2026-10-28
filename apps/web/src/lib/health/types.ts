/**
 * - ok: configurado y respondiendo
 * - error: configurado pero falla (clave inválida, sin red, caído)
 * - off: sin configurar (opcional, la app funciona sin él)
 */
export type CheckStatus = "ok" | "error" | "off";

export interface CheckOutcome {
  status: CheckStatus;
  detail: string;
}
