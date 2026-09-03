import { describe, expect, it, vi } from "vitest";

import {
  MercadoPagoOAuthService,
  type MercadoPagoOAuthRepository,
} from "../../../supabase/functions/_shared/payments/services/mercado-pago-oauth-service.ts";

const encryptionKey = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
const now = new Date("2026-08-24T20:00:00.000Z");

const repository = (): MercadoPagoOAuthRepository => ({
  canManageOrganization: vi.fn().mockResolvedValue(true),
  savePendingState: vi.fn().mockResolvedValue(undefined),
  consumePendingState: vi.fn(),
  upsertConnection: vi.fn().mockResolvedValue(undefined),
});

const gateway = () => ({
  buildAuthorizationUrl: vi.fn(({ state }) => `https://auth.test/?state=${state}`),
  exchangeAuthorizationCode: vi.fn().mockResolvedValue({
    accessToken: "seller-access-token",
    refreshToken: "seller-refresh-token",
    publicKey: "seller-public-key",
    providerUserId: "123456",
    liveMode: true,
    expiresInSeconds: 15_552_000,
    tokenType: "bearer",
    scopes: ["offline_access", "payments", "write"],
  }),
});

describe("MercadoPagoOAuthService", () => {
  it("creates an expiring, encrypted PKCE state for an authorized NGO manager", async () => {
    const repo = repository();
    const oauth = gateway();
    const service = new MercadoPagoOAuthService(repo, oauth, encryptionKey, () => now);

    const result = await service.begin({
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      requestedLiveMode: true,
      redirectUri: "https://example.test/oauth/callback",
    });

    expect(result.authorizationUrl).toMatch(/^https:\/\/auth\.test\//);
    expect(repo.savePendingState).toHaveBeenCalledOnce();
    const stored = vi.mocked(repo.savePendingState).mock.calls[0][0];
    expect(stored.stateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.encryptedCodeVerifier).toMatch(/^v1\./);
    expect(stored.encryptedCodeVerifier).not.toContain(result.state);
    expect(stored.expiresAt).toBe("2026-08-24T20:10:00.000Z");
  });

  it("rejects users who cannot manage the organization", async () => {
    const repo = repository();
    vi.mocked(repo.canManageOrganization).mockResolvedValue(false);
    const service = new MercadoPagoOAuthService(repo, gateway(), encryptionKey, () => now);

    await expect(service.begin({
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      requestedLiveMode: true,
      redirectUri: "https://example.test/oauth/callback",
    })).rejects.toMatchObject({
      code: "mercado-pago-oauth-forbidden",
      httpStatus: 403,
    });
    expect(repo.savePendingState).not.toHaveBeenCalled();
  });

  it("consumes state once, exchanges the code and stores only encrypted tokens", async () => {
    const repo = repository();
    const oauth = gateway();
    const service = new MercadoPagoOAuthService(repo, oauth, encryptionKey, () => now);
    const start = await service.begin({
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      requestedLiveMode: true,
      redirectUri: "https://example.test/oauth/callback",
    });
    const pending = vi.mocked(repo.savePendingState).mock.calls[0][0];
    vi.mocked(repo.consumePendingState).mockResolvedValue(pending);

    const result = await service.complete({ code: "authorization-code", state: start.state });

    expect(oauth.exchangeAuthorizationCode).toHaveBeenCalledWith(expect.objectContaining({
      code: "authorization-code",
      state: start.state,
    }));
    expect(repo.upsertConnection).toHaveBeenCalledOnce();
    const connection = vi.mocked(repo.upsertConnection).mock.calls[0][0];
    expect(connection.encryptedAccessToken).toMatch(/^v1\./);
    expect(connection.encryptedRefreshToken).toMatch(/^v1\./);
    expect(JSON.stringify(connection)).not.toContain("seller-access-token");
    expect(JSON.stringify(connection)).not.toContain("seller-refresh-token");
    expect(result).toMatchObject({ providerUserId: "123456", liveMode: true });
  });

  it("rejects missing, expired or replayed state before contacting OAuth", async () => {
    const repo = repository();
    const oauth = gateway();
    vi.mocked(repo.consumePendingState).mockResolvedValue(null);
    const service = new MercadoPagoOAuthService(repo, oauth, encryptionKey, () => now);

    await expect(service.complete({ code: "code", state: "unknown" }))
      .rejects.toMatchObject({ code: "mercado-pago-oauth-state-invalid" });
    expect(oauth.exchangeAuthorizationCode).not.toHaveBeenCalled();
  });
});
