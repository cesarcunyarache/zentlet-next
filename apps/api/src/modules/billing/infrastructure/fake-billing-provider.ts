import { vi } from 'vitest';
import { BillingProvider } from '../domain/billing-provider.js';

// Not a *.spec.ts file, so vitest's `**/*.spec.ts` include does not run it as a test.
export class FakeBillingProvider extends BillingProvider {
  readonly name = 'mercadopago';
  createCheckout = vi.fn<BillingProvider['createCheckout']>();
  getSubscription = vi.fn<BillingProvider['getSubscription']>();
  getPayment = vi.fn<BillingProvider['getPayment']>();
  cancelSubscription = vi.fn<BillingProvider['cancelSubscription']>();
  refundPayment = vi.fn<BillingProvider['refundPayment']>();
  parseWebhook = vi.fn<BillingProvider['parseWebhook']>();
}
