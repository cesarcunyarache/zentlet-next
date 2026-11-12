import { Injectable } from '@nestjs/common';
import { BillingProviderError, type BillingProvider } from '../domain/billing-provider.js';
import { BillingProviderRegistry } from '../domain/billing-provider-registry.js';
import { MercadoPagoProvider } from './mercadopago/mercadopago.provider.js';

const DEFAULT_PROVIDER = 'mercadopago';

@Injectable()
export class DefaultBillingProviderRegistry extends BillingProviderRegistry {
  private readonly providers: Map<string, BillingProvider>;

  constructor(mercadoPagoProvider: MercadoPagoProvider) {
    super();
    this.providers = new Map([[mercadoPagoProvider.name, mercadoPagoProvider]]);
  }

  current(): BillingProvider {
    return this.get(process.env.BILLING_PROVIDER || DEFAULT_PROVIDER);
  }

  get(name: string): BillingProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new BillingProviderError(`Unknown billing provider: ${name}`, 500);
    return provider;
  }

  isKnown(name: string): boolean {
    return this.providers.has(name);
  }
}
