import { vi } from 'vitest';
import { BillingProviderRegistry } from '../../domain/billing-provider-registry.js';
import { BillingProvider, BillingProviderError } from '../../domain/billing-provider.js';

// Shared fakes for use-case specs in this directory — not a *.spec.ts file,
// so vitest's `**/*.spec.ts` include does not try to run it as a test.
export class FakeBillingProvider extends BillingProvider {
  readonly name = 'mercadopago';
  createCheckout = vi.fn<BillingProvider['createCheckout']>();
  getSubscription = vi.fn<BillingProvider['getSubscription']>();
  getPayment = vi.fn<BillingProvider['getPayment']>();
  cancelSubscription = vi.fn<BillingProvider['cancelSubscription']>();
  refundPayment = vi.fn<BillingProvider['refundPayment']>();
  parseWebhook = vi.fn<BillingProvider['parseWebhook']>();
}

export class FakeBillingProviderRegistry extends BillingProviderRegistry {
  constructor(private readonly provider: BillingProvider) {
    super();
  }

  current(): BillingProvider {
    return this.provider;
  }

  get(name: string): BillingProvider {
    if (name !== this.provider.name) throw new BillingProviderError(`Unknown billing provider: ${name}`, 500);
    return this.provider;
  }

  isKnown(name: string): boolean {
    return name === this.provider.name;
  }
}
