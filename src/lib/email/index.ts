import type { CheckOutcome } from "@/lib/health/types";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import { createResendSender } from "./adapters/resend";
import type { Email, EmailSender } from "./types";

/*
 * Correo transaccional (verificación, contraseña, avisos). El proveedor se
 * elige con `EMAIL_PROVIDER` (por defecto `resend`); añadir otro es
 * escribir su adaptador y registrarlo en `PROVIDERS`.
 *
 * Sin proveedor configurado:
 * - en desarrollo el correo se escribe en la terminal (con su enlace), para
 *   poder probar los flujos en local;
 * - en producción es un error de configuración: se registra y se reporta.
 */

const PROVIDERS: Record<string, () => EmailSender | null> = {
  resend: () => (process.env.RESEND_API_KEY ? createResendSender(process.env.RESEND_API_KEY) : null),
};

const isProduction = () => process.env.NODE_ENV === "production";

function resolveSender() {
  const from = process.env.EMAIL_FROM;
  const sender = PROVIDERS[process.env.EMAIL_PROVIDER || "resend"]?.() ?? null;
  return sender && from ? { sender, from } : null;
}

/** Hay proveedor y remitente: se pueden exigir correos verificados. */
export const isEmailConfigured = () => resolveSender() !== null;

/** Nunca lanza: un fallo de correo no debe romper el registro ni el login. */
export async function sendEmail(email: Email): Promise<boolean> {
  const configured = resolveSender();

  if (!configured) {
    if (!isProduction()) {
      logger.info({ to: "[dev]", subject: email.subject, text: email.text }, "email.dev_outbox");
      return true;
    }
    reportError(new Error("Email is not configured"), "email.not_configured", { subject: email.subject });
    return false;
  }

  try {
    await configured.sender.send(email, configured.from);
    return true;
  } catch (error) {
    reportError(error, "email.send_failed", { provider: configured.sender.name, subject: email.subject });
    return false;
  }
}

export async function checkEmail(): Promise<CheckOutcome> {
  const provider = process.env.EMAIL_PROVIDER || "resend";
  if (!PROVIDERS[provider]) return { status: "error", detail: `Proveedor desconocido: ${provider}` };
  const sender = PROVIDERS[provider]();
  if (!sender) {
    return isProduction()
      ? { status: "error", detail: `Faltan las credenciales de ${provider}` }
      : { status: "off", detail: "Sin configurar · correos en la terminal" };
  }
  if (!process.env.EMAIL_FROM) return { status: "error", detail: "Falta EMAIL_FROM" };
  return sender.check();
}

export type { Email, EmailSender } from "./types";
