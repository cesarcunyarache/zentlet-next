import prisma from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";

/*
 * Estado de cada servicio del que depende la app. Cada comprobación es
 * barata y sin efectos: un `SELECT 1`, o una llamada autenticada que no
 * envía nada (listar modelos, dominios…) para confirmar que la clave vale.
 * Ningún secreto ni mensaje de error crudo sale en la respuesta.
 *
 * - ok: configurado y respondiendo
 * - error: configurado pero falla (clave inválida, sin red, caído)
 * - off: sin configurar (opcional, la app funciona sin él)
 */

export type CheckStatus = "ok" | "error" | "off";

export interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  detail: string;
  latencyMs?: number;
}

const TIMEOUT_MS = 5_000;
const isProduction = process.env.NODE_ENV === "production";

const ok = (detail: string) => ({ status: "ok" as const, detail });
const fail = (detail: string) => ({ status: "error" as const, detail });
const off = (detail = "Sin configurar") => ({ status: "off" as const, detail });

type Outcome = Pick<CheckResult, "status" | "detail">;

async function timed(id: string, name: string, run: () => Promise<Outcome>): Promise<CheckResult> {
  const startedAt = performance.now();
  let outcome: Outcome;
  try {
    outcome = await run();
  } catch (error) {
    logger.warn({ err: error, check: id }, "health.check_failed");
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    outcome = fail(timedOut ? "Sin respuesta (timeout)" : "No se pudo conectar");
  }
  const latencyMs = outcome.status === "off" ? undefined : Math.round(performance.now() - startedAt);
  return { id, name, ...outcome, latencyMs };
}

function request(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
}

async function database(): Promise<Outcome> {
  if (!process.env.DATABASE_URL) return fail("Falta DATABASE_URL");
  await prisma.$queryRaw`SELECT 1`;
  return ok("Conectada");
}

async function sentry(): Promise<Outcome> {
  const serverDsn = process.env.SENTRY_DSN;
  const clientDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!serverDsn && !clientDsn) return off();
  if (!serverDsn) return fail("Falta SENTRY_DSN (servidor)");
  if (!clientDsn) return fail("Falta NEXT_PUBLIC_SENTRY_DSN (navegador)");

  const Sentry = await import("@sentry/nextjs");
  if (!Sentry.isInitialized()) return fail("El SDK no arrancó en el servidor");
  return ok(process.env.SENTRY_AUTH_TOKEN ? "Activo · source maps en el build" : "Activo · sin source maps");
}

async function posthog(): Promise<Outcome> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return off();
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  const response = await request(`${host}/flags/?v=2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, distinct_id: "healthcheck" }),
  });
  if (response.ok) return ok("Clave válida");
  if (response.status === 401) return fail("Clave de proyecto inválida");
  return fail(`PostHog respondió ${response.status}`);
}

async function turnstile(): Promise<Outcome> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!siteKey && !secret) return off("Sin configurar · CAPTCHA desactivado");
  if (!siteKey || !secret) return fail("Faltan claves: hacen falta las dos");

  // un token falso: Cloudflare dice si el fallo es del token o del secreto
  const response = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: "healthcheck" }),
  });
  const { "error-codes": codes = [] } = (await response.json()) as { "error-codes"?: string[] };
  if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
    return fail("Clave secreta inválida");
  }
  return ok("Clave secreta válida");
}

async function resend(): Promise<Outcome> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return isProduction ? fail("Falta RESEND_API_KEY") : off("Sin configurar · correos en la terminal");
  if (!process.env.EMAIL_FROM) return fail("Falta EMAIL_FROM");

  const response = await request("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (response.ok) return ok("Clave válida");
  // una clave sólo de envío no puede listar dominios, pero es válida
  const { name } = (await response.json().catch(() => ({}))) as { name?: string };
  if (name === "restricted_api_key") return ok("Clave válida (sólo envío)");
  return fail(response.status < 500 ? "Clave inválida" : `Resend respondió ${response.status}`);
}

async function gemini(): Promise<Outcome> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return off("Sin configurar · IA desactivada");

  const response = await request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
    headers: { "x-goog-api-key": key },
  });
  if (response.ok) return ok("Clave válida");
  return fail(response.status < 500 ? "Clave inválida" : `Google respondió ${response.status}`);
}

async function authSecret(): Promise<Outcome> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return fail("Falta BETTER_AUTH_SECRET");
  if (secret.length < 32) return fail("BETTER_AUTH_SECRET demasiado corto (mín. 32)");
  if (!process.env.BETTER_AUTH_URL) return fail("Falta BETTER_AUTH_URL");
  return ok("Configurado");
}

/**
 * Sólo se comprueba que existan: validarlas exigiría un login real. El
 * botón se muestra siempre en el login, así que faltar es un error.
 */
function oauth(idVar: string, secretVar: string) {
  return async (): Promise<Outcome> => {
    const missing = [idVar, secretVar].filter((name) => !process.env[name]);
    if (missing.length) return fail(`Falta ${missing.join(" y ")}`);
    return ok("Credenciales presentes");
  };
}

export function runHealthChecks(): Promise<CheckResult[]> {
  return Promise.all([
    timed("database", "Base de datos", database),
    timed("auth", "Autenticación", authSecret),
    timed("sentry", "Sentry", sentry),
    timed("posthog", "PostHog", posthog),
    timed("turnstile", "Cloudflare Turnstile", turnstile),
    timed("resend", "Resend (correo)", resend),
    timed("gemini", "Gemini (IA)", gemini),
    timed("google", "Google OAuth", oauth("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET")),
    timed("github", "GitHub OAuth", oauth("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET")),
  ]);
}
