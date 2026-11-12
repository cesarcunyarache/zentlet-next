import { Injectable } from '@nestjs/common';
import {
  BillingProvider,
  BillingProviderError,
  type CheckoutInput,
  type CheckoutResult,
  type PaymentSnapshot,
  type RefundInput,
  type SubscriptionSnapshot,
  type WebhookNotification,
  type WebhookRequest,
  type WebhookResource,
} from '../../domain/billing-provider.js';
import { Logger } from '../../../../shared/logger/types.js';
import {
  checkoutBody,
  fromCents,
  toPaymentSnapshot,
  toSubscriptionSnapshot,
  type MpAuthorizedPayment,
  type MpPreapproval,
} from './mercadopago.mapper.js';
import { checkSignature, type SignatureCheck } from './mercadopago.signature.js';

const PRODUCTION_API_URL = 'https://api.mercadopago.com';
const TIMEOUT_MS = 10_000;
const MAX_WEBHOOK_BYTES = 16 * 1024;

const WEBHOOK_RESOURCES: Record<string, WebhookResource> = {
  subscription_preapproval: 'subscription',
  subscription_authorized_payment: 'payment',
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  idempotencyKey?: string;
};

type WebhookBody = {
  id?: string | number;
  type?: string;
  data?: { id?: string | number };
};

@Injectable()
export class MercadoPagoProvider extends BillingProvider {
  readonly name = 'mercadopago';

  constructor(private readonly logger: Logger) {
    super();
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const created = await this.request<MpPreapproval>('/preapproval', {
      method: 'POST',
      body: checkoutBody({ ...input, payerEmail: this.sandboxPayerEmail() ?? input.payerEmail }, new Date()),
      idempotencyKey: `checkout:${input.subscriptionId}`,
    });
    if (!created.init_point) throw new BillingProviderError('Mercado Pago returned no checkout url', 502);
    return { externalId: created.id, checkoutUrl: created.init_point };
  }

  async getSubscription(externalId: string): Promise<SubscriptionSnapshot> {
    return toSubscriptionSnapshot(await this.request<MpPreapproval>(`/preapproval/${encodeURIComponent(externalId)}`));
  }

  async getPayment(externalId: string): Promise<PaymentSnapshot> {
    return toPaymentSnapshot(
      await this.request<MpAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(externalId)}`),
    );
  }

  async cancelSubscription(externalId: string): Promise<void> {
    await this.request(`/preapproval/${encodeURIComponent(externalId)}`, { method: 'PUT', body: { status: 'cancelled' } });
  }

  async refundPayment({ providerPaymentId, amount, idempotencyKey }: RefundInput): Promise<void> {
    await this.request(`/v1/payments/${encodeURIComponent(providerPaymentId)}/refunds`, {
      method: 'POST',
      body: { amount: fromCents(amount) },
      idempotencyKey,
    });
  }

  parseWebhook({ rawBody, headers, query }: WebhookRequest): WebhookNotification | null {
    const body = this.readWebhookBody(rawBody);
    const bodyDataId = body?.data?.id === undefined ? null : String(body.data.id);

    const signature = this.verifyWebhook(headers, [...new Set([query.dataId, bodyDataId])]);
    if (signature !== 'valid' || !body) {
      this.logger.warn(
        { signature, hasQueryDataId: query.dataId !== null, hasRequestId: headers.requestId !== null, hasBody: body !== null },
        'billing.webhook_rejected',
      );
      return null;
    }

    const type = query.type ?? body.type ?? 'unknown';
    const resourceId = query.dataId ?? bodyDataId;
    const eventId = body.id === undefined ? headers.requestId : `${type}:${body.id}`;
    if (!resourceId || !eventId) return null;

    return { eventId, type, resource: WEBHOOK_RESOURCES[type] ?? 'ignored', resourceId };
  }

  private isProduction(): boolean {
    // NODE_ENV, not VERCEL_ENV: this adapter runs in a standalone Nest process,
    // not on Vercel, so the Next.js deployment env var does not apply here.
    return process.env.NODE_ENV === 'production';
  }

  private sandboxPayerEmail(): string | undefined {
    return this.isProduction() ? undefined : process.env.MERCADOPAGO_TEST_PAYER_EMAIL || undefined;
  }

  private apiUrl(): string {
    return (!this.isProduction() && process.env.MERCADOPAGO_API_URL) || PRODUCTION_API_URL;
  }

  private requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new BillingProviderError(`${name} is not configured`, 500);
    return value;
  }

  private async request<T>(path: string, { method = 'GET', body, idempotencyKey }: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.requireEnv('MERCADOPAGO_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey && { 'X-Idempotency-Key': idempotencyKey }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw await this.providerError(response, `${method} ${path.split('?')[0]}`);
    return (await response.json()) as T;
  }

  private async providerError(response: Response, operation: string): Promise<BillingProviderError> {
    const reason = await response
      .json()
      .then((body: { message?: string }) => body.message)
      .catch(() => undefined);
    const detail = reason ? `: ${reason}` : '';
    return new BillingProviderError(`Mercado Pago ${operation} failed (${response.status})${detail}`, response.status);
  }

  private readWebhookBody(rawBody: string): WebhookBody | null {
    if (Buffer.byteLength(rawBody) > MAX_WEBHOOK_BYTES) return null;
    try {
      return JSON.parse(rawBody) as WebhookBody;
    } catch {
      return null;
    }
  }

  private verifyWebhook(headers: WebhookRequest['headers'], dataIds: (string | null)[]): SignatureCheck {
    const input = {
      header: headers.signature,
      requestId: headers.requestId,
      secret: this.requireEnv('MERCADOPAGO_WEBHOOK_SECRET'),
      now: Date.now(),
    };
    const checks = dataIds.map((dataId) => checkSignature({ ...input, dataId }));
    return checks.find((check) => check === 'valid') ?? checks[0];
  }
}
