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
        +-- MercadoPagoProvider (PIX sandbox + Marketplace Split 1:1 live)
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
current rule is: the amount chosen by the donor is destined to the organization
and the 5% platform support is added to the charged total. Mercado Pago deducts
its own processing tariff from the seller balance according to the commercial
conditions of that account, so the interface must not promise that the chosen
amount is the organization's net settlement amount.

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
- `payment_reconciliations`: internal/provider comparisons written by the private reconciliation job.
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
  -> provider adapter
  -> redirect or PIX QR action
  -> signed provider webhook
  -> provider webhook adapter
  -> NormalizedPaymentEvent
  -> PaymentEventService
  -> payments + donations
  -> confirm-payment and post-donation experience
```

The frontend only consumes a `PaymentAction` (`redirect`, `qr_code`,
`client_secret`, or `completed`). It cannot mark a payment as paid.

For live Mercado Pago PIX, the frontend collects the payer e-mail and CPF. The
backend validates both, forwards them to Mercado Pago and does not persist the
CPF in the TranquiliCare payment tables.

The old `create-checkout-session`, `confirm-checkout-session`, and
`stripe-webhook` functions remain thin compatibility wrappers during rollout.

## Webhooks and Idempotency

The generic endpoints are:

```text
https://PROJECT_REF.supabase.co/functions/v1/payment-webhook?provider=stripe
https://PROJECT_REF.supabase.co/functions/v1/payment-webhook?provider=mercado_pago
```

Each adapter verifies the provider signature before normalizing the event.
`payment_events` has `UNIQUE(provider, provider_event_id)`. Processed or
currently processing events are ignored; failed events can be claimed again on
the provider's retry. Only a sanitized subset is stored, not secrets or PCI
data.

## Reconciliation, Refunds, and Disputes

`PaymentProvider` exposes status, refunds, and an optional reconciliation
contract. The private `reconcile-payments` Edge Function rechecks stale Mercado
Pago attempts with the original NGO credential and records every comparison.
It is protected by `PAYMENT_OPERATIONS_SECRET` and should be invoked by a
scheduler. Mercado Pago refunds remain intentionally disabled until the
business policy and automated endpoint are approved; the pilot uses the manual
operations procedure in the production runbook.

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

Pagar.me remains a domain placeholder. Mercado Pago is registered at runtime,
uses OAuth PKCE per NGO, encrypts seller credentials at rest, routes live PIX
with `application_fee`, and remains opt-in through a live organization
allowlist.

## Decisions Before Another Provider

- Confirm each provider's legal marketplace model and recipient onboarding for
  Brazilian organizations.
- Decide who absorbs processing fees per method while preserving the product
  promise shown to donors.
- Define PIX expiration and asynchronous payment UX.
- Define refund ownership, partial refunds, disputes, and negative balances.
- Validate settlement and reconciliation reports before enabling routing by
  cost, country, or method.
