import "dotenv/config";

export const APP_PORT = 3100;
export const MOCK_PORT = 4010;
export const APP_URL = `http://localhost:${APP_PORT}`;
export const MOCK_URL = `http://localhost:${MOCK_PORT}`;
export const AUTH_STATE = "e2e/.auth/user.json";

const WEBHOOK_SECRET = "e2e-webhook-secret";
export const INBOUND_EMAIL_SECRET = "e2e-inbound-secret";
const E2E_SUFFIX = "_e2e_test";

export function e2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL or E2E_DATABASE_URL is required for E2E tests");

  const url = new URL(process.env.DATABASE_URL);
  if (!url.pathname.endsWith(E2E_SUFFIX)) url.pathname += E2E_SUFFIX;
  return url.toString();
}

export const mockEnv = {
  MOCK_MP_PORT: String(MOCK_PORT),
  MOCK_MP_APP_URL: APP_URL,
  MERCADOPAGO_WEBHOOK_SECRET: WEBHOOK_SECRET,
};

export const appEnv = {
  DATABASE_URL: e2eDatabaseUrl(),
  BETTER_AUTH_URL: APP_URL,
  NEXT_PUBLIC_SITE_URL: APP_URL,
  NEXT_PUBLIC_BETTER_AUTH_URL: "",
  NEXT_PUBLIC_API_URL: "",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
  RESEND_API_KEY: "",
  SENTRY_DSN: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  SENTRY_AUTH_TOKEN: "",
  NEXT_PUBLIC_POSTHOG_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
  LOG_LEVEL: "warn",
  BILLING_PROVIDER: "mercadopago",
  MERCADOPAGO_API_URL: MOCK_URL,
  MERCADOPAGO_ACCESS_TOKEN: "e2e-access-token",
  MERCADOPAGO_WEBHOOK_SECRET: WEBHOOK_SECRET,
  MERCADOPAGO_TEST_PAYER_EMAIL: "",
  INBOUND_EMAIL_DOMAIN: "in.zentlet.test",
  INBOUND_EMAIL_SECRET,
};
