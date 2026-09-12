import type { SupabaseClient } from "npm:@supabase/supabase-js@2.53.0";
import { PaymentError } from "../domain/payment.errors.ts";
import type {
  MercadoPagoConnectionRecord,
  MercadoPagoOAuthRepository,
  PendingMercadoPagoOAuthState,
} from "../services/mercado-pago-oauth-service.ts";
import type {
  MercadoPagoCredentialReplacement,
  MercadoPagoCredentialRepository,
  MercadoPagoStoredCredential,
} from "../services/mercado-pago-credential-service.ts";

const MANAGER_ROLES = ["owner", "admin", "finance"];

type AdminClient = SupabaseClient;

export interface MercadoPagoConnectionStatus {
  connected: boolean;
  readyToReceive?: boolean;
  recipientId?: string;
  providerUserId?: string;
  status?: string;
  liveMode?: boolean;
  expiresAt?: string;
}

export class SupabaseMercadoPagoOAuthRepository
  implements MercadoPagoOAuthRepository, MercadoPagoCredentialRepository {
  constructor(private readonly client: AdminClient) {}

  async canManageOrganization(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("profile_id", userId)
      .eq("status", "active")
      .in("role", MANAGER_ROLES)
      .maybeSingle();
    if (error) {
      throw new PaymentError(
        "mercado-pago-membership-load-failed",
        "Could not verify organization access",
        500,
        { cause: error },
      );
    }
    return Boolean(data);
  }

  async savePendingState(state: PendingMercadoPagoOAuthState): Promise<void> {
    const { error } = await this.client.from("payment_oauth_states").insert({
      organization_id: state.organizationId,
      initiated_by: state.initiatedBy,
      provider: "mercado_pago",
      state_hash: state.stateHash,
      encrypted_code_verifier: state.encryptedCodeVerifier,
      redirect_uri: state.redirectUri,
      requested_live_mode: state.requestedLiveMode,
      expires_at: state.expiresAt,
    });
    if (error) {
      throw new PaymentError(
        "mercado-pago-oauth-state-save-failed",
        "Could not start Mercado Pago connection",
        500,
        { cause: error },
      );
    }
  }

  async consumePendingState(
    stateHash: string,
    consumedAt: string,
  ): Promise<PendingMercadoPagoOAuthState | null> {
    const { data, error } = await this.client
      .from("payment_oauth_states")
      .update({ consumed_at: consumedAt })
      .eq("provider", "mercado_pago")
      .eq("state_hash", stateHash)
      .is("consumed_at", null)
      .gt("expires_at", consumedAt)
      .select(
        "organization_id, initiated_by, state_hash, encrypted_code_verifier, redirect_uri, requested_live_mode, expires_at",
      )
      .maybeSingle();
    if (error) {
      throw new PaymentError(
        "mercado-pago-oauth-state-load-failed",
        "Could not validate Mercado Pago authorization",
        500,
        { cause: error },
      );
    }
    if (!data) return null;
    return {
      organizationId: data.organization_id,
      initiatedBy: data.initiated_by,
      stateHash: data.state_hash,
      encryptedCodeVerifier: data.encrypted_code_verifier,
      redirectUri: data.redirect_uri,
      requestedLiveMode: data.requested_live_mode,
      expiresAt: data.expires_at,
    };
  }

  async upsertConnection(connection: MercadoPagoConnectionRecord): Promise<void> {
    const { data: recipient, error: recipientError } = await this.client
      .from("payment_recipients")
      .upsert({
        organization_id: connection.organizationId,
        organization_uuid: connection.organizationId,
        provider: "mercado_pago",
        provider_recipient_id: connection.providerUserId,
        status: "active",
        livemode: connection.liveMode,
        capabilities: { pix: true, split: true, refunds: false },
        metadata: {
          oauth_connected_at: connection.connectedAt,
          public_key: connection.publicKey,
        },
      }, { onConflict: "organization_id,provider,livemode" })
      .select("id")
      .single();
    if (recipientError || !recipient) {
      throw new PaymentError(
        "mercado-pago-recipient-save-failed",
        "Could not save Mercado Pago recipient",
        500,
        { cause: recipientError },
      );
    }

    const { error: credentialError } = await this.client
      .from("payment_recipient_credentials")
      .upsert({
        recipient_id: recipient.id,
        provider: "mercado_pago",
        provider_user_id: connection.providerUserId,
        encrypted_access_token: connection.encryptedAccessToken,
        encrypted_refresh_token: connection.encryptedRefreshToken,
        token_type: connection.tokenType,
        scopes: connection.scopes,
        live_mode: connection.liveMode,
        expires_at: connection.expiresAt,
        refreshed_at: connection.connectedAt,
        disconnected_at: null,
      }, { onConflict: "recipient_id" });
    if (credentialError) {
      throw new PaymentError(
        "mercado-pago-credential-save-failed",
        "Could not save Mercado Pago credentials",
        500,
        { cause: credentialError },
      );
    }
  }

  async loadCredential(
    recipientId: string,
  ): Promise<MercadoPagoStoredCredential | null> {
    const { data, error } = await this.client
      .from("payment_recipient_credentials")
      .select("id, recipient_id, encrypted_access_token, encrypted_refresh_token, live_mode, expires_at, refreshed_at, disconnected_at")
      .eq("recipient_id", recipientId)
      .maybeSingle();
    if (error) {
      throw new PaymentError(
        "mercado-pago-credential-load-failed",
        "Could not load Mercado Pago credentials",
        500,
        { cause: error },
      );
    }
    if (!data) return null;
    return {
      id: data.id,
      recipientId: data.recipient_id,
      encryptedAccessToken: data.encrypted_access_token,
      encryptedRefreshToken: data.encrypted_refresh_token,
      liveMode: data.live_mode,
      expiresAt: data.expires_at,
      refreshedAt: data.refreshed_at,
      disconnectedAt: data.disconnected_at,
    };
  }

  async replaceCredential(
    current: MercadoPagoStoredCredential,
    replacement: MercadoPagoCredentialReplacement,
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from("payment_recipient_credentials")
      .update({
        encrypted_access_token: replacement.encryptedAccessToken,
        encrypted_refresh_token: replacement.encryptedRefreshToken,
        expires_at: replacement.expiresAt,
        refreshed_at: replacement.refreshedAt,
        token_type: replacement.tokenType,
        scopes: replacement.scopes,
      })
      .eq("id", current.id)
      .eq("refreshed_at", current.refreshedAt)
      .is("disconnected_at", null)
      .select("id")
      .maybeSingle();
    if (error) {
      throw new PaymentError(
        "mercado-pago-credential-refresh-save-failed",
        "Could not renew Mercado Pago credentials",
        500,
        { cause: error },
      );
    }
    return Boolean(data);
  }
  async getConnection(
    organizationId: string,
    liveMode: boolean,
  ): Promise<MercadoPagoConnectionStatus> {
    const { data: recipient, error: recipientError } = await this.client
      .from("payment_recipients")
      .select("id, provider_recipient_id, status, livemode")
      .eq("organization_id", organizationId)
      .eq("provider", "mercado_pago")
      .eq("livemode", liveMode)
      .maybeSingle();
    if (recipientError) throw recipientError;
    if (!recipient) return { connected: false };
    const { data: credential, error: credentialError } = await this.client
      .from("payment_recipient_credentials")
      .select("live_mode, expires_at, disconnected_at")
      .eq("recipient_id", recipient.id)
      .maybeSingle();
    if (credentialError) throw credentialError;
    const credentialUsable = Boolean(
      credential
        && !credential.disconnected_at
        && new Date(credential.expires_at).getTime() > Date.now()
        && credential.live_mode === recipient.livemode
        && recipient.status === "active",
    );
    let readyToReceive = false;
    if (credentialUsable && recipient.livemode) {
      const [{ data: organization, error: organizationError }, { data: ngo, error: ngoError }] =
        await Promise.all([
          this.client
            .from("organizations")
            .select("status")
            .eq("id", organizationId)
            .maybeSingle(),
          this.client
            .from("ngo_profiles")
            .select("verification_status")
            .eq("user_id", organizationId)
            .maybeSingle(),
        ]);
      if (organizationError || ngoError) throw organizationError ?? ngoError;
      readyToReceive = organization?.status === "active"
        && ngo?.verification_status === "verified";
    }
    return {
      connected: credentialUsable,
      readyToReceive,
      recipientId: recipient.id,
      providerUserId: recipient.provider_recipient_id,
      status: recipient.status,
      liveMode: recipient.livemode,
      ...(credential ? { expiresAt: credential.expires_at } : {}),
    };
  }

  async disconnect(organizationId: string, liveMode: boolean): Promise<void> {
    const connection = await this.getConnection(organizationId, liveMode);
    if (!connection.recipientId) return;
    const disconnectedAt = new Date().toISOString();
    const [{ error: credentialError }, { error: recipientError }] =
      await Promise.all([
        this.client
          .from("payment_recipient_credentials")
          .update({ disconnected_at: disconnectedAt })
          .eq("recipient_id", connection.recipientId),
        this.client
          .from("payment_recipients")
          .update({ status: "disabled" })
          .eq("id", connection.recipientId),
      ]);
    if (credentialError || recipientError) {
      throw new PaymentError(
        "mercado-pago-disconnect-failed",
        "Could not disconnect Mercado Pago",
        500,
        { cause: credentialError ?? recipientError },
      );
    }
  }
}
