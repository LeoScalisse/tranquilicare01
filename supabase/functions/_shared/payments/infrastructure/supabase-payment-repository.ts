import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.53.0';
import { PaymentError } from '../domain/payment.errors.ts';
import type {
  CreatePaymentResult,
  NormalizedPaymentEvent,
  PaymentProviderName,
  PaymentRecipient,
  PaymentStatus,
} from '../domain/payment.types.ts';
import type {
  CreateDonationAttemptInput,
  DonationPaymentAttempt,
  DonationPaymentRepository,
} from '../services/donation-payment-service.ts';
import type {
  PaymentEventClaim,
  PaymentEventRepository,
} from '../services/payment-event-service.ts';

type AdminClient = SupabaseClient;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const domainId = (value?: string | null) => value && UUID_PATTERN.test(value) ? value : null;

const donationStatusFromPayment = (status?: PaymentStatus) => {
  if (status === 'paid') return 'succeeded';
  if (status === 'failed' || status === 'canceled') return 'failed';
  if (status === 'refunded') return 'refunded';
  return null;
};

const statusTimestamp = (status?: PaymentStatus) => {
  if (status === 'paid') return { paid_at: new Date().toISOString() };
  if (status === 'failed') return { failed_at: new Date().toISOString() };
  if (status === 'canceled') return { canceled_at: new Date().toISOString() };
  if (status === 'refunded') return { refunded_at: new Date().toISOString() };
  return {};
};

const donationStatusTimestamp = (status?: PaymentStatus) => {
  if (status === 'paid') return { paid_at: new Date().toISOString() };
  if (status === 'failed' || status === 'canceled') return { failed_at: new Date().toISOString() };
  if (status === 'refunded') return { refunded_at: new Date().toISOString() };
  return {};
};

export class SupabaseDonationPaymentRepository implements DonationPaymentRepository {
  constructor(private readonly client: AdminClient) {}

  async findRecipient(
    organizationId: string,
    provider: PaymentProviderName,
    livemode: boolean,
  ): Promise<PaymentRecipient | null> {
    const { data, error } = await this.client
      .from('payment_recipients')
      .select('id, organization_id, provider, provider_recipient_id, status, livemode')
      .eq('organization_id', organizationId)
      .eq('provider', provider)
      .eq('livemode', livemode)
      .maybeSingle();
    if (error) throw new PaymentError('recipient-load-failed', 'Could not load payment recipient', 500, { cause: error });
    if (!data) return null;
    if (!data.livemode) {
      return {
        id: data.id,
        organizationId: data.organization_id,
        provider: data.provider as PaymentProviderName,
        providerRecipientId: data.provider_recipient_id,
        status: data.status,
        livemode: data.livemode,
      };
    }
    const organizationUuid = domainId(organizationId);
    if (!organizationUuid) {
      return {
        id: data.id,
        organizationId: data.organization_id,
        provider: data.provider as PaymentProviderName,
        providerRecipientId: data.provider_recipient_id,
        status: 'restricted',
        livemode: data.livemode,
      };
    }
    const [{ data: organization, error: organizationError }, { data: ngo, error: ngoError }] =
      await Promise.all([
        this.client
          .from('organizations')
          .select('status')
          .eq('id', organizationUuid)
          .maybeSingle(),
        this.client
          .from('ngo_profiles')
          .select('verification_status')
          .eq('user_id', organizationUuid)
          .maybeSingle(),
      ]);
    if (organizationError || ngoError) {
      throw new PaymentError('recipient-eligibility-load-failed', 'Could not verify payment recipient eligibility', 500, {
        cause: organizationError ?? ngoError,
      });
    }
    const eligible = data.status === 'active'
      && organization?.status === 'active'
      && ngo?.verification_status === 'verified';
    return {
      id: data.id,
      organizationId: data.organization_id,
      provider: data.provider as PaymentProviderName,
      providerRecipientId: data.provider_recipient_id,
      status: eligible ? data.status : 'restricted',
      livemode: data.livemode,
    };
  }

  async createAttempt(input: CreateDonationAttemptInput): Promise<DonationPaymentAttempt> {
    const donationRow = {
      id: input.donationId,
      donor_id: input.donorId,
      donor_profile_id: input.donorId,
      ngo_id: input.organizationId,
      organization_id: domainId(input.organizationId),
      campaign_id: input.campaignId,
      campaign_uuid: domainId(input.campaignId),
      payment_provider: input.provider,
      payment_method: input.method,
      provider_recipient_id: input.recipient.providerRecipientId,
      amount_cents: input.donationAmountCents,
      platform_fee_cents: input.platformFeeCents,
      amount_to_recipient_cents: input.donationAmountCents,
      status: 'pending',
      ...(input.provider === 'stripe' ? { stripe_account_id: input.recipient.providerRecipientId } : {}),
    };
    const { error: donationError } = await this.client.from('donations').insert(donationRow);
    if (donationError) {
      throw new PaymentError('donation-create-failed', 'Could not create donation record', 500, { cause: donationError });
    }

    const { error: paymentError } = await this.client.from('payments').insert({
      id: input.paymentId,
      donation_id: input.donationId,
      recipient_id: input.recipient.id,
      provider: input.provider,
      payment_method: input.method,
      currency: 'brl',
      donation_amount_cents: input.donationAmountCents,
      platform_fee_cents: input.platformFeeCents,
      total_amount_cents: input.totalAmountCents,
      expected_recipient_amount_cents: input.donationAmountCents,
      confirmation_token_hash: input.confirmationTokenHash,
      confirmation_expires_at: input.confirmationExpiresAt,
      status: 'created',
    });
    if (paymentError) {
      await this.client.from('donations').update({ status: 'failed' }).eq('id', input.donationId);
      throw new PaymentError('payment-create-failed', 'Could not create payment record', 500, { cause: paymentError });
    }
    return { donationId: input.donationId, paymentId: input.paymentId };
  }

  async markActionCreated(attempt: DonationPaymentAttempt, result: CreatePaymentResult): Promise<void> {
    const { error: paymentError } = await this.client
      .from('payments')
      .update({
        provider_payment_id: result.providerPaymentId ?? null,
        provider_action_id: result.providerActionId ?? null,
        status: result.status,
      })
      .eq('id', attempt.paymentId);
    if (paymentError) throw new PaymentError('payment-update-failed', 'Could not save payment action', 500, { cause: paymentError });

    const donationUpdate: Record<string, unknown> = {
      provider_payment_id: result.providerPaymentId ?? null,
      provider_action_id: result.providerActionId ?? null,
    };
    if (result.provider === 'stripe') {
      donationUpdate.stripe_payment_intent_id = result.providerPaymentId ?? null;
      donationUpdate.stripe_checkout_session_id = result.providerActionId ?? null;
    }
    const { error: donationError } = await this.client
      .from('donations')
      .update(donationUpdate)
      .eq('id', attempt.donationId);
    if (donationError) throw new PaymentError('donation-update-failed', 'Could not save donation payment action', 500, { cause: donationError });
  }

  async markAttemptFailed(attempt: DonationPaymentAttempt, code: string): Promise<void> {
    await Promise.all([
      this.client.from('payments').update({ status: 'failed', failure_code: code, failed_at: new Date().toISOString() }).eq('id', attempt.paymentId),
      this.client.from('donations').update({ status: 'failed', failed_at: new Date().toISOString() }).eq('id', attempt.donationId),
    ]);
  }
}

export class SupabasePaymentEventRepository implements PaymentEventRepository {
  constructor(private readonly client: AdminClient) {}

  async claim(event: NormalizedPaymentEvent): Promise<PaymentEventClaim> {
    const { error } = await this.client.from('payment_events').insert({
      provider: event.provider,
      provider_event_id: event.providerEventId,
      donation_id: event.donationId ?? null,
      event_type: event.type,
      provider_payload: event.sanitizedPayload ?? null,
      processing_status: 'processing',
    });
    if (!error) return 'claimed';
    if (error.code !== '23505') throw error;

    const { data, error: loadError } = await this.client
      .from('payment_events')
      .select('processing_status')
      .eq('provider', event.provider)
      .eq('provider_event_id', event.providerEventId)
      .single();
    if (loadError) throw loadError;
    if (data.processing_status !== 'failed') return 'duplicate';

    const { error: retryError } = await this.client
      .from('payment_events')
      .update({ processing_status: 'processing', error_message: null })
      .eq('provider', event.provider)
      .eq('provider_event_id', event.providerEventId);
    if (retryError) throw retryError;
    return 'retry';
  }

  async apply(event: NormalizedPaymentEvent): Promise<void> {
    if (event.type === 'recipient.updated' && event.providerRecipientId) {
      const capabilities = event.sanitizedPayload ?? {};
      const active = capabilities.chargesEnabled === true && capabilities.payoutsEnabled === true;
      const { error } = await this.client
        .from('payment_recipients')
        .update({ status: active ? 'active' : 'restricted', capabilities })
        .eq('provider', event.provider)
        .eq('provider_recipient_id', event.providerRecipientId);
      if (error) throw error;
      return;
    }

    let payment: { id: string; donation_id: string } | null = null;
    const references: Array<['provider_payment_id' | 'provider_action_id' | 'donation_id', string | null | undefined]> = [
      ['provider_payment_id', event.providerPaymentId],
      ['provider_action_id', event.providerActionId],
      ['donation_id', event.donationId],
    ];
    for (const [field, value] of references) {
      if (!value || payment) continue;
      const { data, error } = await this.client
        .from('payments')
        .select('id, donation_id')
        .eq('provider', event.provider)
        .eq(field, value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      payment = data;
    }
    if (!payment && !event.donationId) return;
    const donationId = event.donationId ?? payment?.donation_id ?? null;
    const paymentId = payment?.id ?? null;

    if (paymentId && event.status) {
      const { error } = await this.client
        .from('payments')
        .update({
          status: event.status,
          ...(event.providerPaymentId ? { provider_payment_id: event.providerPaymentId } : {}),
          ...(event.providerActionId ? { provider_action_id: event.providerActionId } : {}),
          ...statusTimestamp(event.status),
        })
        .eq('id', paymentId);
      if (error) throw error;
    }

    const donationStatus = donationStatusFromPayment(event.status);
    if (donationId && donationStatus) {
      const update: Record<string, unknown> = {
        status: donationStatus,
        ...(event.providerPaymentId ? { provider_payment_id: event.providerPaymentId } : {}),
        ...(event.providerActionId ? { provider_action_id: event.providerActionId } : {}),
        ...donationStatusTimestamp(event.status),
      };
      if (event.provider === 'stripe') {
        if (event.providerPaymentId) update.stripe_payment_intent_id = event.providerPaymentId;
        if (event.providerActionId) update.stripe_checkout_session_id = event.providerActionId;
      }
      const { error } = await this.client.from('donations').update(update).eq('id', donationId);
      if (error) throw error;
    }

    const { error: eventUpdateError } = await this.client
      .from('payment_events')
      .update({ payment_id: paymentId, donation_id: donationId })
      .eq('provider', event.provider)
      .eq('provider_event_id', event.providerEventId);
    if (eventUpdateError) throw eventUpdateError;
  }

  async markProcessed(provider: string, providerEventId: string): Promise<void> {
    const { error } = await this.client
      .from('payment_events')
      .update({ processing_status: 'processed', processed_at: new Date().toISOString(), error_message: null })
      .eq('provider', provider)
      .eq('provider_event_id', providerEventId);
    if (error) throw error;
  }

  async markFailed(provider: string, providerEventId: string, message: string): Promise<void> {
    const { error } = await this.client
      .from('payment_events')
      .update({ processing_status: 'failed', error_message: message })
      .eq('provider', provider)
      .eq('provider_event_id', providerEventId);
    if (error) console.error('Could not mark payment event as failed', { provider, providerEventId });
  }
}
