import { PaymentError } from "../domain/payment.errors.ts";
import {
  createOAuthState,
  createPkcePair,
  hashOAuthState,
  type MercadoPagoOAuthCredentials,
} from "../providers/mercado-pago/mercado-pago-oauth-client.ts";
import {
  decryptPaymentCredential,
  encryptPaymentCredential,
} from "../security/credential-crypto.ts";

export interface PendingMercadoPagoOAuthState {
  organizationId: string;
  initiatedBy: string;
  stateHash: string;
  encryptedCodeVerifier: string;
  redirectUri: string;
  requestedLiveMode: boolean;
  expiresAt: string;
}

export interface MercadoPagoConnectionRecord {
  organizationId: string;
  providerUserId: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  publicKey: string | null;
  tokenType: string;
  scopes: string[];
  liveMode: boolean;
  expiresAt: string;
  connectedAt: string;
}

export interface MercadoPagoOAuthRepository {
  canManageOrganization(organizationId: string, userId: string): Promise<boolean>;
  savePendingState(state: PendingMercadoPagoOAuthState): Promise<void>;
  consumePendingState(
    stateHash: string,
    consumedAt: string,
  ): Promise<PendingMercadoPagoOAuthState | null>;
  upsertConnection(connection: MercadoPagoConnectionRecord): Promise<void>;
}

export interface MercadoPagoOAuthGateway {
  buildAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
  }): string;
  exchangeAuthorizationCode(input: {
    code: string;
    state: string;
    codeVerifier: string;
  }): Promise<MercadoPagoOAuthCredentials>;
}

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export class MercadoPagoOAuthService {
  constructor(
    private readonly repository: MercadoPagoOAuthRepository,
    private readonly oauth: MercadoPagoOAuthGateway,
    private readonly encryptionKey: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async begin(input: {
    organizationId: string;
    userId: string;
    requestedLiveMode: boolean;
    redirectUri: string;
  }): Promise<{ authorizationUrl: string; state: string }> {
    if (!await this.repository.canManageOrganization(
      input.organizationId,
      input.userId,
    )) {
      throw new PaymentError(
        "mercado-pago-oauth-forbidden",
        "You cannot manage payments for this organization",
        403,
      );
    }

    const state = createOAuthState();
    const pkce = await createPkcePair();
    const createdAt = this.now();
    await this.repository.savePendingState({
      organizationId: input.organizationId,
      initiatedBy: input.userId,
      stateHash: await hashOAuthState(state),
      encryptedCodeVerifier: await encryptPaymentCredential(
        pkce.verifier,
        this.encryptionKey,
      ),
      redirectUri: input.redirectUri,
      requestedLiveMode: input.requestedLiveMode,
      expiresAt: new Date(createdAt.getTime() + OAUTH_STATE_TTL_MS).toISOString(),
    });

    return {
      state,
      authorizationUrl: this.oauth.buildAuthorizationUrl({
        state,
        codeChallenge: pkce.challenge,
      }),
    };
  }

  async complete(input: {
    code: string;
    state: string;
  }): Promise<{ providerUserId: string; liveMode: boolean; organizationId: string }> {
    if (!input.code || !input.state) {
      throw new PaymentError(
        "mercado-pago-oauth-input-invalid",
        "OAuth callback is incomplete",
        400,
      );
    }

    const consumedAt = this.now();
    const pending = await this.repository.consumePendingState(
      await hashOAuthState(input.state),
      consumedAt.toISOString(),
    );
    if (!pending || new Date(pending.expiresAt).getTime() <= consumedAt.getTime()) {
      throw new PaymentError(
        "mercado-pago-oauth-state-invalid",
        "OAuth authorization expired or was already used",
        400,
      );
    }

    const codeVerifier = await decryptPaymentCredential(
      pending.encryptedCodeVerifier,
      this.encryptionKey,
    );
    const credentials = await this.oauth.exchangeAuthorizationCode({
      code: input.code,
      state: input.state,
      codeVerifier,
    });
    if (credentials.liveMode !== pending.requestedLiveMode) {
      throw new PaymentError(
        "mercado-pago-oauth-mode-mismatch",
        "The connected Mercado Pago account does not match the requested environment",
        409,
      );
    }

    await this.repository.upsertConnection({
      organizationId: pending.organizationId,
      providerUserId: credentials.providerUserId,
      encryptedAccessToken: await encryptPaymentCredential(
        credentials.accessToken,
        this.encryptionKey,
      ),
      encryptedRefreshToken: await encryptPaymentCredential(
        credentials.refreshToken,
        this.encryptionKey,
      ),
      publicKey: credentials.publicKey,
      tokenType: credentials.tokenType,
      scopes: credentials.scopes,
      liveMode: credentials.liveMode,
      expiresAt: new Date(
        consumedAt.getTime() + credentials.expiresInSeconds * 1000,
      ).toISOString(),
      connectedAt: consumedAt.toISOString(),
    });

    return {
      providerUserId: credentials.providerUserId,
      liveMode: credentials.liveMode,
      organizationId: pending.organizationId,
    };
  }
}
