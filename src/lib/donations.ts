import { supabase } from "./supabase";
import type { DonationRow } from "./impact";

export interface DonationPaymentInput {
  organizationId: string;
  campaignId?: string;
  amountCents: number;
  payerEmail?: string;
  method?: "card" | "pix" | "boleto";
  provider?: "stripe" | "mercado_pago";
}

type PublicPaymentConfirmation = {
  status?:
    | "pending"
    | "paid"
    | "failed"
    | "canceled"
    | "refunded"
    | "partially_refunded"
    | "disputed";
  donation?: {
    id: string;
    organizationId: string | null;
    amountCents: number;
    createdAt: string;
    paymentActionId: string | null;
  };
};

type CreatePaymentResponse = {
  action?: {
    type?: "redirect" | "qr_code" | "client_secret" | "completed";
    redirectUrl?: string;
    qrCode?: string;
    qrCodeText?: string;
  };
  confirmationToken?: string;
  actionId?: string;
  paymentId?: string;
};

export const startDonationPayment = async (
  input: DonationPaymentInput,
): Promise<string> => {
  if (!supabase) throw new Error("payments-not-configured");

  const { data, error } =
    await supabase.functions.invoke<CreatePaymentResponse>("create-payment", {
      body: input,
    });

  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const body = await response.clone().json();
        if (typeof body?.error === "string") throw new Error(body.error);
      } catch (responseError) {
        if (
          responseError instanceof Error &&
          responseError.message !== "Unexpected end of JSON input"
        ) {
          throw responseError;
        }
      }
    }
    throw error;
  }
  const url =
    data?.action?.type === "redirect" &&
    typeof data.action.redirectUrl === "string"
      ? data.action.redirectUrl
      : "";
  if (!url) throw new Error("payment-action-missing");
  return url;
};
export type PixPaymentAction = {
  actionId: string;
  qrCode?: string;
  qrCodeText: string;
  confirmationToken: string;
};

export type PrototypePixPaymentAction = PixPaymentAction & {
  isPrototype: true;
  prototypeDonation: {
    organizationId: string;
    amountCents: number;
    createdAt: string;
  };
};

let prototypePixSequence = 0;

/**
 * Produces a local-only PIX action for the TranquiliCare demonstration NGO.
 * It deliberately does not invoke a payment provider or persist a charge.
 */
export const startPrototypePixDonation = (
  input: Pick<DonationPaymentInput, "organizationId" | "amountCents" | "payerEmail">,
): PrototypePixPaymentAction => {
  prototypePixSequence += 1;
  const createdAt = new Date().toISOString();
  const actionId = `prototype-pix-${Date.now().toString(36)}-${prototypePixSequence}`;

  return {
    actionId,
    qrCodeText: `SIMULACAO-PIX:${actionId}`,
    confirmationToken: `prototype-confirmation-${actionId}`,
    isPrototype: true,
    prototypeDonation: {
      organizationId: input.organizationId,
      amountCents: input.amountCents,
      createdAt,
    },
  };
};

/** Completes a local-only demonstration donation after the user confirms it. */
export const confirmPrototypePixDonation = (
  payment: PrototypePixPaymentAction,
  donorEmail: string | null,
): DonationRow => ({
  id: `prototype-donation-${payment.actionId}`,
  amount: payment.prototypeDonation.amountCents,
  donor_id: null,
  donor_email: donorEmail,
  created_at: payment.prototypeDonation.createdAt,
  ngo_id: payment.prototypeDonation.organizationId,
  payment_action_id: payment.actionId,
});

export const startMercadoPagoPixDonation = async (
  input: Omit<DonationPaymentInput, "provider" | "method">,
): Promise<PixPaymentAction> => {
  if (!supabase) throw new Error("payments-not-configured");

  const { data, error } = await supabase.functions.invoke<
    CreatePaymentResponse & { actionId?: string }
  >("create-payment", {
    body: { ...input, provider: "mercado_pago", method: "pix" },
  });

  if (error) {
    const response = (error as { context?: Response }).context;
    if (response) {
      const body = await response
        .clone()
        .json()
        .catch(() => null);
      if (typeof body?.code === "string") throw new Error(body.code);
      if (typeof body?.error === "string") throw new Error(body.error);
    }
    throw error;
  }

  const action = data?.action;
  if (
    action?.type !== "qr_code" ||
    !action.qrCodeText ||
    !data?.confirmationToken ||
    !data.actionId
  ) {
    throw new Error("pix-action-missing");
  }

  return {
    actionId: data.actionId,
    qrCode: action.qrCode,
    qrCodeText: action.qrCodeText,
    confirmationToken: data.confirmationToken,
  };
};
const waitForProviderDonationConfirmation = (
  actionId: string,
  donorEmail: string | null,
  confirmationToken: string | null,
  timeoutMs = 60_000,
): Promise<DonationRow> => {
  if (!supabase) return Promise.reject(new Error("payments-not-configured"));

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
      const { data, error } =
        await supabase.functions.invoke<PublicPaymentConfirmation>(
          "confirm-payment",
          {
            body: confirmationToken
              ? { actionId, confirmationToken }
              : { actionId },
          },
        );
      checking = false;

      if (settled) return;
      if (error) {
        console.error("Could not confirm donation payment:", error);
        return;
      }
      if (
        data?.status === "failed" ||
        data?.status === "canceled" ||
        data?.status === "refunded" ||
        data?.status === "partially_refunded" ||
        data?.status === "disputed"
      ) {
        settled = true;
        cleanup();
        reject(new Error("payment-not-succeeded"));
        return;
      }
      if (data?.status !== "paid" || !data.donation) return;

      settled = true;
      cleanup();
      resolve({
        id: data.donation.id,
        amount: Number(data.donation.amountCents) || 0,
        donor_id: null,
        donor_email: donorEmail,
        created_at: data.donation.createdAt,
        ngo_id: data.donation.organizationId,
        payment_action_id: data.donation.paymentActionId,
      });
    };

    const pollTimer = window.setInterval(() => void check(), 2_000);
    const timeoutTimer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("payment-confirmation-timeout"));
    }, timeoutMs);

    void check();
  });
};
/** Resolves only after the backend confirms the current status with the payment provider. */
export const waitForDonationConfirmation = (
  actionId: string,
  donorEmail: string | null,
  confirmationToken: string | null,
  timeoutMs = 60_000,
): Promise<DonationRow> => {
  if (!actionId || actionId.length > 255)
    return Promise.reject(new Error("invalid-payment-action"));
  if (
    !donorEmail &&
    (!confirmationToken ||
      confirmationToken.length < 32 ||
      confirmationToken.length > 255)
  ) {
    return Promise.reject(new Error("invalid-payment-confirmation-token"));
  }
  return waitForProviderDonationConfirmation(
    actionId,
    donorEmail,
    confirmationToken,
    timeoutMs,
  );
};
