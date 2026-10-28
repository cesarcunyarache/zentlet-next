import type { CheckOutcome } from "@/lib/health/types";

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Proveedor de correo transaccional. El resto del código sólo conoce
 * `sendEmail` (en `index.ts`); cada proveedor es un adaptador que lanza si
 * el envío falla y sabe comprobar sus propias credenciales.
 */
export interface EmailSender {
  readonly name: string;
  send(email: Email, from: string): Promise<void>;
  check(): Promise<CheckOutcome>;
}
