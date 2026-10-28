import { logger } from "@/lib/observability/logger";
import { BillingProviderError, type BillingProvider, type WebhookNotification, type WebhookResource } from "../types";
import {
  checkoutBody,
  fromCents,
  toPaymentSnapshot,
  toSubscriptionSnapshot,
  type MpAuthorizedPayment,
  type MpPreapproval,
} from "./mapper";
import { checkSignature, type SignatureCheck } from "./signature";

const PRODUCTION_API_URL = "https://api.mercadopago.com";
const TIMEOUT_MS = 10_000;
const MAX_WEBHOOK_BYTES = 16 * 1024;

const WEBHOOK_RESOURCES: Record<string, WebhookResource> = {
  subscription_preapproval: "subscription",
  subscription_authorized_payment: "payment",
};

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  idempotencyKey?: string;
}

interface WebhookBody {
  id?: string | number;
  type?: string;
  data?: { id?: string | number };
}

const isProduction = () => process.env.VERCEL_ENV === "production";

function sandboxPayerEmail() {
  return isProduction() ? undefined : process.env.MERCADOPAGO_TEST_PAYER_EMAIL || undefined;
}

function apiUrl() {
  return (!isProduction() && process.env.MERCADOPAGO_API_URL) || PRODUCTION_API_URL;
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new BillingProviderError(`${name} is not configured`, 500);
  return value;
}

async function mpRequest<T>(path: string, { method = "GET", body, idempotencyKey }: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireEnv("MERCADOPAGO_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
      ...(idempotencyKey && { "X-Idempotency-Key": idempotencyKey }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await providerError(response, `${method} ${path.split("?")[0]}`);
  return (await response.json()) as T;
}

async function providerError(response: Response, operation: string) {
  const reason = await response
    .json()
    .then((body: { message?: string }) => body.message)
    .catch(() => undefined);
  const detail = reason ? `: ${reason}` : "";
  return new BillingProviderError(`Mercado Pago ${operation} failed (${response.status})${detail}`, response.status);
}

async function readWebhookBody(req: Request): Promise<WebhookBody | null> {
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_WEBHOOK_BYTES) return null;
  try {
    return JSON.parse(text) as WebhookBody;
  } catch {
    return null;
  }
}

function verifyWebhook(req: Request, dataIds: (string | null)[]): SignatureCheck {
  const input = {
    header: req.headers.get("x-signature"),
    requestId: req.headers.get("x-request-id"),
    secret: requireEnv("MERCADOPAGO_WEBHOOK_SECRET"),
    now: Date.now(),
  };
  const checks = dataIds.map((dataId) => checkSignature({ ...input, dataId }));
  return checks.find((check) => check === "valid") ?? checks[0];
}

async function parseWebhook(req: Request): Promise<WebhookNotification | null> {
  const url = new URL(req.url);
  const body = await readWebhookBody(req);
  const queryDataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const bodyDataId = body?.data?.id === undefined ? null : String(body.data.id);
  const requestId = req.headers.get("x-request-id");

  const signature = verifyWebhook(req, [...new Set([queryDataId, bodyDataId])]);
  if (signature !== "valid" || !body) {
    logger.warn(
      { signature, hasQueryDataId: queryDataId !== null, hasRequestId: requestId !== null, hasBody: body !== null },
      "billing.webhook_rejected",
    );
    return null;
  }

  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? "unknown";
  const resourceId = queryDataId ?? bodyDataId;
  const eventId = body.id === undefined ? requestId : `${type}:${body.id}`;
  if (!resourceId || !eventId) return null;

  return { eventId, type, resource: WEBHOOK_RESOURCES[type] ?? "ignored", resourceId };
}

export function createMercadoPagoProvider(): BillingProvider {
  return {
    name: "mercadopago",

    async createCheckout(input) {
      const created = await mpRequest<MpPreapproval>("/preapproval", {
        method: "POST",
        body: checkoutBody({ ...input, payerEmail: sandboxPayerEmail() ?? input.payerEmail }, new Date()),
        idempotencyKey: `checkout:${input.subscriptionId}`,
      });
      if (!created.init_point) throw new BillingProviderError("Mercado Pago returned no checkout url", 502);
      return { externalId: created.id, checkoutUrl: created.init_point };
    },

    async getSubscription(externalId) {
      return toSubscriptionSnapshot(await mpRequest<MpPreapproval>(`/preapproval/${encodeURIComponent(externalId)}`));
    },

    async getPayment(externalId) {
      return toPaymentSnapshot(
        await mpRequest<MpAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(externalId)}`),
      );
    },

    async cancelSubscription(externalId) {
      await mpRequest(`/preapproval/${encodeURIComponent(externalId)}`, { method: "PUT", body: { status: "cancelled" } });
    },

    async refundPayment({ providerPaymentId, amount, idempotencyKey }) {
      await mpRequest(`/v1/payments/${encodeURIComponent(providerPaymentId)}/refunds`, {
        method: "POST",
        body: { amount: fromCents(amount) },
        idempotencyKey,
      });
    },

    parseWebhook,
  };
}
