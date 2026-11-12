import type { BillingProvider } from './billing-provider.js';

// Strategy registry: swapping or adding a payment processor means adding an
// adapter and registering it here — use-cases never know which provider runs.
export abstract class BillingProviderRegistry {
  abstract current(): BillingProvider;
  abstract get(name: string): BillingProvider;
  abstract isKnown(name: string): boolean;
}
