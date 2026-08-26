import { PaymentError } from "../domain/payment.errors.ts";
import type { MercadoPagoOAuthCredentials } from "../providers/mercado-pago/mercado-pago-oauth-client.ts";
import {
  decryptPaymentCredential,
  encryptPaymentCredential,
} from "../security/credential-crypto.ts";

const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface MercadoPagoStoredCredential {
  id: string;
  recipientId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  liveMode: boolean;
  expiresAt: string;
  refreshedAt: string;
  disconnectedAt: string | null;
}

export interface MercadoPagoCredentialReplacement {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: string;
  refreshedAt: string;
  tokenType: string;
  scopes: string[];
}

export interface MercadoPagoCredentialRepository {
  loadCredential(
    recipientId: string,
  ): Promise<MercadoPagoStoredCredential | null>;
  replaceCredential(
    current: MercadoPagoStoredCredential,
    replacement: MercadoPagoCredentialReplacement,
  ): Promise<boolean>;
}

export interface MercadoPagoTokenRefreshGateway {
  refreshCredentials(refreshToken: string): Promise<MercadoPagoOAuthCredentials>;
}

export class MercadoPagoCredentialService {
  constructor(
    private readonly repository: MercadoPagoCredentialRepository,
    private readonly oauth: MercadoPagoTokenRefreshGateway,
    private readonly encryptionKey: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async resolveAccessToken(
    recipientId: string,
    expectedLiveMode: boolean,
  ): Promise<string> {
    const credential = await this.repository.loadCredential(recipientId);
    this.assertUsable(credential, expectedLiveMode);
    const current = credential as MercadoPagoStoredCredential;
    const now = this.now();
    if (new Date(current.expiresAt).getTime() - now.getTime() > REFRESH_WINDOW_MS) {
      return await decryptPaymentCredential(
        current.encryptedAccessToken,
        this.encryptionKey,
      );
    }

    const refreshToken = await decryptPaymentCredential(
      current.encryptedRefreshToken,
      this.encryptionKey,
    );
    const renewed = await this.oauth.refreshCredentials(refreshToken);
    if (renewed.liveMode !== expectedLiveMode) {
      throw new PaymentError(
        "mercado-pago-credential-environment-mismatch",
        "Mercado Pago credential environment does not match",
        409,
      );
    }
    const refreshedAt = now.toISOString();
    const replacement: MercadoPagoCredentialReplacement = {
      encryptedAccessToken: await encryptPaymentCredential(
        renewed.accessToken,
        this.encryptionKey,
      ),
      encryptedRefreshToken: await encryptPaymentCredential(
        renewed.refreshToken,
        this.encryptionKey,
      ),
      expiresAt: new Date(
        now.getTime() + renewed.expiresInSeconds * 1000,
      ).toISOString(),
      refreshedAt,
      tokenType: renewed.tokenType,
      scopes: renewed.scopes,
    };
    const replaced = await this.repository.replaceCredential(
      current,
      replacement,
    );
    if (replaced) return renewed.accessToken;

    const winner = await this.repository.loadCredential(recipientId);
    this.assertUsable(winner, expectedLiveMode);
    return await decryptPaymentCredential(
      (winner as MercadoPagoStoredCredential).encryptedAccessToken,
      this.encryptionKey,
    );
  }

  private assertUsable(
    credential: MercadoPagoStoredCredential | null,
    expectedLiveMode: boolean,
  ): void {
    if (!credential || credential.disconnectedAt) {
      throw new PaymentError(
        "mercado-pago-recipient-not-connected",
        "The organization has not connected Mercado Pago",
        409,
      );
    }
    if (credential.liveMode !== expectedLiveMode) {
      throw new PaymentError(
        "mercado-pago-credential-environment-mismatch",
        "Mercado Pago credential environment does not match",
        409,
      );
    }
    if (!Number.isFinite(new Date(credential.expiresAt).getTime())) {
      throw new PaymentError(
        "mercado-pago-credential-invalid",
        "Mercado Pago credential is invalid",
        409,
      );
    }
  }
}
