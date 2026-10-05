import type { EmailSender } from "../types";

/** Adaptador de Resend por su API HTTP. */

const API_URL = "https://api.resend.com";
const SEND_TIMEOUT_MS = 10_000;
const CHECK_TIMEOUT_MS = 5_000;

export function createResendSender(apiKey: string): EmailSender {
  const authorization = `Bearer ${apiKey}`;

  return {
    name: "resend",
    async send(email, from) {
      const response = await fetch(`${API_URL}/emails`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
    },
    async check() {
      const response = await fetch(`${API_URL}/domains`, {
        headers: { Authorization: authorization },
        cache: "no-store",
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      });
      if (response.ok) return { status: "ok", detail: "Clave válida" };
      // una clave sólo de envío no puede listar dominios, pero es válida
      const { name } = (await response.json().catch(() => ({}))) as { name?: string };
      if (name === "restricted_api_key") return { status: "ok", detail: "Clave válida (sólo envío)" };
      return { status: "error", detail: response.status < 500 ? "Clave inválida" : `Resend respondió ${response.status}` };
    },
  };
}
