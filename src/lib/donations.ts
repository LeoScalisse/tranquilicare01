import { supabase } from './supabase';
import type { DonationRow } from './impact';

export interface DonationCheckoutInput {
  ngoId: string;
  campaignId?: string;
  amountCents: number;
}

type CheckoutDonationRow = {
  id: string;
  donor_id: string | null;
  ngo_id: string | null;
  amount_cents: number;
  created_at: string;
  stripe_checkout_session_id: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
};

type PublicCheckoutConfirmation = {
  status?: CheckoutDonationRow['status'];
  donation?: Omit<CheckoutDonationRow, 'donor_id' | 'status'>;
};

export const createDonationCheckout = async (input: DonationCheckoutInput): Promise<string> => {
  if (!supabase) throw new Error('payments-not-configured');

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: input,
  });

  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const body = await response.clone().json();
        if (typeof body?.error === 'string') throw new Error(body.error);
      } catch (responseError) {
        if (responseError instanceof Error && responseError.message !== 'Unexpected end of JSON input') {
          throw responseError;
        }
      }
    }
    throw error;
  }
  const url = typeof data?.url === 'string' ? data.url : '';
  if (!url) throw new Error('checkout-url-missing');
  return url;
};

const waitForAnonymousDonationConfirmation = (
  sessionId: string,
  timeoutMs = 60_000,
): Promise<DonationRow> => {
  if (!supabase) return Promise.reject(new Error('payments-not-configured'));

  return new Promise((resolve, reject) => {
    let settled = false;
    let checking = false;

    const cleanup = () => {
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
    };

    const check = async () => {
      if (checking || settled) return;
      checking = true;
      const { data, error } = await supabase.functions.invoke<PublicCheckoutConfirmation>(
        'confirm-checkout-session',
        { body: { sessionId } },
      );
      checking = false;

      if (settled) return;
      if (error) {
        console.error('Could not confirm anonymous checkout donation:', error);
        return;
      }
      if (data?.status === 'failed' || data?.status === 'refunded') {
        settled = true;
        cleanup();
        reject(new Error('payment-not-succeeded'));
        return;
      }
      if (data?.status !== 'succeeded' || !data.donation) return;

      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        id: data.donation.id,
        amount: Number(data.donation.amount_cents) || 0,
        donor_id: null,
        donor_email: null,
        created_at: data.donation.created_at,
        ngo_id: data.donation.ngo_id,
        stripe_checkout_session_id: data.donation.stripe_checkout_session_id,
      });
    };

    const pollTimer = window.setInterval(() => void check(), 1500);
    const timeoutTimer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('payment-confirmation-timeout'));
    }, timeoutMs);

    void check();
  });
};

const waitForAuthenticatedDonationConfirmation = (
  sessionId: string,
  donorEmail: string,
  timeoutMs = 60_000,
): Promise<DonationRow> => {
  if (!supabase) return Promise.reject(new Error('payments-not-configured'));

  return new Promise((resolve, reject) => {
    let settled = false;
    let checking = false;
    const channel = supabase.channel(`checkout-confirmation-${sessionId}`);

    const cleanup = () => {
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      void supabase.removeChannel(channel);
    };

    const finish = (row: CheckoutDonationRow) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        id: row.id,
        amount: Number(row.amount_cents) || 0,
        donor_id: row.donor_id,
        donor_email: donorEmail,
        created_at: row.created_at,
        ngo_id: row.ngo_id,
        stripe_checkout_session_id: row.stripe_checkout_session_id,
      });
    };

    const check = async () => {
      if (checking || settled) return;
      checking = true;
      const { data, error } = await supabase
        .from('donations')
        .select('id, donor_id, ngo_id, amount_cents, created_at, stripe_checkout_session_id, status')
        .eq('stripe_checkout_session_id', sessionId)
        .maybeSingle<CheckoutDonationRow>();
      checking = false;

      if (settled) return;
      if (error) {
        console.error('Could not confirm checkout donation:', error);
        return;
      }
      if (data?.status === 'succeeded') finish(data);
      if (data?.status === 'failed' || data?.status === 'refunded') {
        settled = true;
        cleanup();
        reject(new Error('payment-not-succeeded'));
      }
    };

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'donations',
          filter: `stripe_checkout_session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as CheckoutDonationRow;
          if (row.status === 'succeeded') finish(row);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void check();
      });

    const pollTimer = window.setInterval(() => void check(), 1500);
    const timeoutTimer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('payment-confirmation-timeout'));
    }, timeoutMs);

    void check();
  });
};

/** Resolves only after Stripe and the signed webhook confirm the checkout. */
export const waitForDonationConfirmation = (
  sessionId: string,
  donorEmail: string | null,
  timeoutMs = 60_000,
): Promise<DonationRow> => {
  if (!sessionId.startsWith('cs_')) return Promise.reject(new Error('invalid-checkout-session'));
  return donorEmail
    ? waitForAuthenticatedDonationConfirmation(sessionId, donorEmail, timeoutMs)
    : waitForAnonymousDonationConfirmation(sessionId, timeoutMs);
};
