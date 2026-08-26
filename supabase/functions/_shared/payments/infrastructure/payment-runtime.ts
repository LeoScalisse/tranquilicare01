import { PaymentError } from "../domain/payment.errors.ts";
import type { PaymentProviderName } from "../domain/payment.types.ts";
import { PAYMENT_PROVIDER_NAMES } from "../domain/payment.types.ts";
import { createStripeProvider } from "../providers/stripe/stripe-client.ts";
import {
  createMercadoPagoProvider,
  type MercadoPagoProviderOptions,
} from "../providers/mercado-pago/mercado-pago-provider.ts";
import { PaymentProviderRegistry } from "../services/payment-provider-registry.ts";
import { PaymentService } from "../services/payment-service.ts";

const providerName = (value: string | undefined): PaymentProviderName => {
  if (PAYMENT_PROVIDER_NAMES.includes(value as PaymentProviderName))
    return value as PaymentProviderName;
  throw new PaymentError(
    "invalid-default-provider",
    "Default payment provider is invalid",
    500,
  );
};

export interface PaymentRuntime {
  service: PaymentService;
  defaultProvider: PaymentProviderName;
}

export interface PaymentRuntimeOptions {
  mercadoPago?: MercadoPagoProviderOptions;
}

export const createPaymentRuntime = (
  options: PaymentRuntimeOptions = {},
): PaymentRuntime => {
  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const mercadoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  const providers = [
    ...(stripeSecret
      ? [
          createStripeProvider(
            stripeSecret,
            Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? null,
          ),
        ]
      : []),
    ...(mercadoToken
      ? [
          createMercadoPagoProvider(
            mercadoToken,
            Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") ?? null,
            Deno.env.get("MERCADO_PAGO_LIVEMODE") === "true",
            options.mercadoPago,
          ),
        ]
      : []),
  ];
  if (!providers.length)
    throw new PaymentError(
      "payment-provider-not-configured",
      "Payment provider is not configured",
      503,
    );
  const defaultProvider = providerName(
    Deno.env.get("DEFAULT_PAYMENT_PROVIDER") ?? "stripe",
  );
  const registry = new PaymentProviderRegistry(providers);

  return {
    service: new PaymentService(registry, defaultProvider),
    defaultProvider,
  };
};
