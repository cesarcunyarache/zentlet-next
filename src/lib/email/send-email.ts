import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";

/*
 * Envío de correos transaccionales (verificación, contraseña). Usa la API
 * HTTP de Resend; cambiar de proveedor sólo toca este archivo.
 *
 * Sin `RESEND_API_KEY`:
 * - en desarrollo el correo se escribe en la terminal (con su enlace), para
 *   poder probar los flujos en local;
 * - en producción es un error de configuración: se registra y se reporta.
 */

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Nunca lanza: un fallo de correo no debe romper el registro ni el login. */
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      logger.info({ to: "[dev]", subject: email.subject, text: email.text }, "email.dev_outbox");
      return true;
    }
    reportError(new Error("Email is not configured"), "email.not_configured", { subject: email.subject });
    return false;
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      reportError(new Error(`Email provider responded ${response.status}`), "email.rejected", {
        status: response.status,
        subject: email.subject,
      });
      return false;
    }
    return true;
  } catch (error) {
    reportError(error, "email.unavailable", { subject: email.subject });
    return false;
  }
}
