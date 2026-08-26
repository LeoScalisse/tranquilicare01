import { describe, expect, it, vi } from "vitest";

import {
  createMercadoPagoOAuthClient,
  createOAuthState,
  createPkcePair,
  hashOAuthState,
} from "../../../supabase/functions/_shared/payments/providers/mercado-pago/mercado-pago-oauth-client.ts";

const config = {
  clientId: "8928116791047556",
  clientSecret: "client-secret-never-log",
  redirectUri: "https://example.test/functions/v1/mercado-pago-oauth-callback",
};

describe("Mercado Pago OAuth client", () => {
  it("creates an S256 PKCE pair and an opaque state hash", async () => {
    const pair = await createPkcePair();
    const state = createOAuthState();

    expect(pair.verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await hashOAuthState(state)).toMatch(/^[a-f0-9]{64}$/);
    expect(await hashOAuthState(state)).not.toContain(state);
  });

  it("builds the marketplace authorization URL with state and PKCE", () => {
    const client = createMercadoPagoOAuthClient(config);
    const url = new URL(client.buildAuthorizationUrl({
      state: "oauth-state",
      codeChallenge: "pkce-challenge",
    }));

    expect(url.origin + url.pathname).toBe(
      "https://auth.mercadopago.com.br/authorization",
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      response_type: "code",
      client_id: config.clientId,
      platform_id: "mp",
      redirect_uri: config.redirectUri,
      state: "oauth-state",
      code_challenge: "pkce-challenge",
      code_challenge_method: "S256",
    });
  });

  it("exchanges an authorization code without putting secrets in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: "seller-access",
      refresh_token: "seller-refresh",
      public_key: "seller-public",
      user_id: 123456,
      live_mode: true,
      expires_in: 15_552_000,
      token_type: "bearer",
      scope: "offline_access payments write",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createMercadoPagoOAuthClient(config, fetchMock);

    const credentials = await client.exchangeAuthorizationCode({
      code: "authorization-code",
      state: "oauth-state",
      codeVerifier: "pkce-verifier",
    });

    const [requestUrl, request] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe("https://api.mercadopago.com/oauth/token");
    expect(request.method).toBe("POST");
    expect(String(request.body)).toContain("grant_type=authorization_code");
    expect(String(request.body)).toContain("client_secret=client-secret-never-log");
    expect(String(request.body)).toContain("code_verifier=pkce-verifier");
    expect(requestUrl).not.toContain(config.clientSecret);
    expect(credentials).toMatchObject({
      accessToken: "seller-access",
      refreshToken: "seller-refresh",
      providerUserId: "123456",
      liveMode: true,
      scopes: ["offline_access", "payments", "write"],
    });
  });

  it("renews credentials with the refresh-token grant", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: "renewed-access",
      refresh_token: "renewed-refresh",
      user_id: 123456,
      live_mode: true,
      expires_in: 15_552_000,
      token_type: "bearer",
      scope: "offline_access payments write",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = createMercadoPagoOAuthClient(config, fetchMock);

    await client.refreshCredentials("old-refresh");

    const body = String(fetchMock.mock.calls[0][1].body);
    expect(body).toContain("grant_type=refresh_token");
    expect(body).toContain("refresh_token=old-refresh");
  });

  it("returns a sanitized provider error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: "client secret client-secret-never-log is invalid",
    }), { status: 401, headers: { "content-type": "application/json" } }));
    const client = createMercadoPagoOAuthClient(config, fetchMock);

    const outcome = client.exchangeAuthorizationCode({
      code: "bad-code",
      state: "state",
      codeVerifier: "verifier",
    });

    await expect(outcome).rejects.toThrow("mercado-pago-oauth-request-failed");
    await expect(outcome).rejects.not.toThrow(config.clientSecret);
  });
});
