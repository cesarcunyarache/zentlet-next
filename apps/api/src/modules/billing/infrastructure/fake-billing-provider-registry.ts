import { BillingProvider, BillingProviderError } from '../domain/billing-provider.js';
import { BillingProviderRegistry } from '../domain/billing-provider-registry.js';

// Not a *.spec.ts file, so vitest's `**/*.spec.ts` include does not run it as a test.
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
