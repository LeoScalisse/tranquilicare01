# Payment Architecture

## Goal

TranquiliCare owns a payment domain. Stripe is the first working provider, not
the domain model. Donation rules use canonical concepts and external gateway
objects remain inside provider adapters.

```text
DonationPaymentService
        |
        v
PaymentService
        |
        v
PaymentProviderRegistry
        |
        +-- StripeProvider (active)
        +-- MercadoPagoProvider (future)
        +-- PagarMeProvider (future)
```

## Domain

The canonical types live in
`supabase/functions/_shared/payments/domain/payment.types.ts`:

- `Payment`: provider-neutral payment attempt associated with a donation.
- `PaymentRecipient`: an organization's receiving identity at one provider.
- `SplitAllocation`: organization and platform allocation without gateway
  vocabulary.
- `PaymentStatus`: `created`, `pending`, `paid`, `failed`, `canceled`,
  `refunded`, `partially_refunded`, or `disputed`.
- `NormalizedPaymentEvent`: a signed provider event mapped to a canonical event.

`donationAmountCents`, `platformFeeCents`, `processingFeeCents`,
`totalAmountCents`, and recipient amounts are intentionally separate. The
current rule remains: the amount chosen as the donation is the expected amount
for the organization; the 5% platform support is added to the charged total.

## Services

- `PaymentService` validates canonical amounts and capabilities, resolves the
  configured provider, and exposes payment, refund, status, webhook, and
  reconciliation operations.
- `DonationPaymentService` creates the internal donation/payment attempt before
  asking a provider for an action.
- `PaymentEventService` claims events by `provider + providerEventId`, applies a
  normalized event once, and allows a failed attempt to be retried.
- `PaymentProviderRegistry` is the only provider resolver. The default provider
  comes from `DEFAULT_PAYMENT_PROVIDER`.

## Stripe Adapter

Only `payments/providers/stripe/stripe-client.ts` imports the Stripe SDK.
`StripeProvider` converts canonical input into Checkout/Connect destination
charges and converts Stripe statuses and webhooks back into canonical output.

Provider-specific compatibility writes still exist in
`SupabaseDonationPaymentRepository` for the deprecated `stripe_*` columns.
They are temporary dual writes that preserve rollback compatibility and old
deployed clients. They are not used by domain rules.

## Database

Migration `20260821000100_provider_agnostic_payments.sql` adds:

- `payment_recipients`: multiple provider identities per organization and mode.
- `payments`: provider-neutral attempts, amounts, method, status, and external
  references.
- `payment_events`: idempotent event ledger with sanitized provider context.
- `payment_reconciliations`: internal/provider comparisons for future jobs.
- neutral `provider_*` fields on `donations`, backfilled from Stripe fields.

The old `ngo_payment_accounts`, `stripe_webhook_events`, and `stripe_*` columns
are retained and marked deprecated. No financial history is dropped. Existing
recipient rows are backfilled as Stripe sandbox rows because the current project
was using a test key; live recipients must be onboarded and inserted separately.

## Runtime Flow

```text
Frontend: startDonationPayment
  -> create-payment Edge Function
  -> DonationPaymentService
  -> PaymentService
  -> StripeProvider
  -> redirect action
  -> signed provider webhook
  -> provider webhook adapter
  -> NormalizedPaymentEvent
  -> PaymentEventService
  -> payments + donations
  -> confirm-payment and post-donation experience
```

The frontend only consumes a `PaymentAction` (`redirect`, `qr_code`,
`client_secret`, or `completed`). It cannot mark a payment as paid.

The old `create-checkout-session`, `confirm-checkout-session`, and
`stripe-webhook` functions remain thin compatibility wrappers during rollout.

## Webhooks and Idempotency

The generic endpoint is:

```text
https://PROJECT_REF.supabase.co/functions/v1/payment-webhook?provider=stripe
```

The Stripe adapter verifies `Stripe-Signature` before normalizing the event.
`payment_events` has `UNIQUE(provider, provider_event_id)`. Processed or
currently processing events are ignored; failed events can be claimed again on
the provider's retry. Only a sanitized subset is stored, not secrets or PCI
data.

## Reconciliation, Refunds, and Disputes

`PaymentProvider` exposes status, refunds, and an optional reconciliation
contract. `PaymentService.reconcilePayment` already compares canonical status
when a provider has no specialized implementation. Stripe refund and dispute
events map to canonical states. An administrative UI and automated
reconciliation schedule are deliberately out of scope.

## Adding a Provider

1. Implement `PaymentProvider` in `payments/providers/<provider>`.
2. Keep the provider SDK import inside that adapter.
3. Map provider statuses to canonical `PaymentStatus` values.
4. Verify and normalize signed webhooks into `NormalizedPaymentEvent`.
5. Register the provider once in `payment-runtime.ts`.
6. Add backend secrets without `VITE_` prefixes.
7. Add provider and fake-provider tests.
8. Enable it through configuration only after recipient onboarding, refunds,
   split behavior, and webhook retries are verified end to end.

Mercado Pago and Pagar.me are names in the central type only. No runtime adapter
or fake integration is registered for either provider.

## Decisions Before Another Provider

- Confirm each provider's legal marketplace model and recipient onboarding for
  Brazilian organizations.
- Decide who absorbs processing fees per method while preserving the product
  promise shown to donors.
- Define PIX expiration and asynchronous payment UX.
- Define refund ownership, partial refunds, disputes, and negative balances.
- Validate settlement and reconciliation reports before enabling routing by
  cost, country, or method.
