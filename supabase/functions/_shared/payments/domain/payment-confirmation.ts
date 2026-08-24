import { PaymentError } from './payment.errors.ts';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const constantTimeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

export interface PaymentConfirmationCredential {
  token: string;
  tokenHash: string;
  expiresAt: string;
}

export interface AuthorizePaymentConfirmationInput {
  donorId: string | null;
  requesterId: string | null;
  confirmationToken: string | null;
  confirmationTokenHash: string | null;
  confirmationExpiresAt: string | null;
  now?: Date;
}

export const hashPaymentConfirmationToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
};

export const createPaymentConfirmationCredential = async (
  now = new Date(),
): Promise<PaymentConfirmationCredential> => {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  const token = bytesToHex(bytes);
  return {
    token,
    tokenHash: await hashPaymentConfirmationToken(token),
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
  };
};

export const authorizePaymentConfirmation = async (
  input: AuthorizePaymentConfirmationInput,
): Promise<'authenticated' | 'anonymous'> => {
  if (input.donorId) {
    if (!input.requesterId) {
      throw new PaymentError('payment-confirmation-auth-required', 'Authentication is required', 401);
    }
    if (input.requesterId !== input.donorId) {
      throw new PaymentError('payment-confirmation-forbidden', 'Payment confirmation is not available', 403);
    }
    return 'authenticated';
  }

  const token = input.confirmationToken?.trim() ?? '';
  const expiresAt = input.confirmationExpiresAt ? Date.parse(input.confirmationExpiresAt) : Number.NaN;
  const now = input.now ?? new Date();
  if (
    token.length < 32
    || token.length > 255
    || !input.confirmationTokenHash
    || !Number.isFinite(expiresAt)
    || expiresAt <= now.getTime()
  ) {
    throw new PaymentError('payment-confirmation-forbidden', 'Payment confirmation is not available', 403);
  }

  const suppliedHash = await hashPaymentConfirmationToken(token);
  if (!constantTimeEqual(suppliedHash, input.confirmationTokenHash)) {
    throw new PaymentError('payment-confirmation-forbidden', 'Payment confirmation is not available', 403);
  }
  return 'anonymous';
};
