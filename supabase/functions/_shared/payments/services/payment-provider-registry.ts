import { PaymentProviderNotConfiguredError } from '../domain/payment.errors.ts';
import type { PaymentProvider } from '../domain/payment-provider.ts';
import type { PaymentProviderName } from '../domain/payment.types.ts';

export class PaymentProviderRegistry {
  private readonly providers = new Map<PaymentProviderName, PaymentProvider>();

  constructor(providers: PaymentProvider[] = []) {
    providers.forEach((provider) => this.register(provider));
  }

  register(provider: PaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: PaymentProviderName): PaymentProvider {
    const provider = this.providers.get(name);
    if (!provider) throw new PaymentProviderNotConfiguredError(name);
    return provider;
  }

  has(name: PaymentProviderName): boolean {
    return this.providers.has(name);
  }
}
