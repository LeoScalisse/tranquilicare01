import { describe, expect, it, vi } from "vitest";

import { encryptPaymentCredential } from "../../../supabase/functions/_shared/payments/security/credential-crypto.ts";
import {
  MercadoPagoCredentialService,
  type MercadoPagoCredentialRepository,
} from "../../../supabase/functions/_shared/payments/services/mercado-pago-credential-service.ts";

const key = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
const now = new Date("2026-08-24T20:00:00.000Z");

const record = async (overrides = {}) => ({
  id: "credential-1",
  recipientId: "recipient-1",
  encryptedAccessToken: await encryptPaymentCredential("current-access", key),
  encryptedRefreshToken: await encryptPaymentCredential("current-refresh", key),
  liveMode: true,
  expiresAt: "2027-01-01T00:00:00.000Z",
  refreshedAt: "2026-08-01T00:00:00.000Z",
  disconnectedAt: null,
  ...overrides,
});

const repository = (): MercadoPagoCredentialRepository => ({
  loadCredential: vi.fn(),
  replaceCredential: vi.fn().mockResolvedValue(true),
});

const oauth = () => ({
  refreshCredentials: vi.fn().mockResolvedValue({
    accessToken: "renewed-access",
    refreshToken: "renewed-refresh",
    publicKey: null,
    providerUserId: "123456",
    liveMode: true,
    expiresInSeconds: 15_552_000,
    tokenType: "bearer",
    scopes: ["offline_access", "payments", "write"],
  }),
});

describe("MercadoPagoCredentialService", () => {
  it("decrypts a healthy seller token without refreshing it", async () => {
    const repo = repository();
    vi.mocked(repo.loadCredential).mockResolvedValue(await record());
    const gateway = oauth();
    const service = new MercadoPagoCredentialService(repo, gateway, key, () => now);

    await expect(service.resolveAccessToken("recipient-1", true)).resolves.toBe(
      "current-access",
    );
    expect(gateway.refreshCredentials).not.toHaveBeenCalled();
  });

  it("renews a token before expiry and persists only encrypted replacements", async () => {
    const repo = repository();
    vi.mocked(repo.loadCredential).mockResolvedValue(await record({
      expiresAt: "2026-08-25T20:00:00.000Z",
    }));
    const gateway = oauth();
    const service = new MercadoPagoCredentialService(repo, gateway, key, () => now);

    await expect(service.resolveAccessToken("recipient-1", true)).resolves.toBe(
      "renewed-access",
    );
    expect(gateway.refreshCredentials).toHaveBeenCalledWith("current-refresh");
    const replacement = vi.mocked(repo.replaceCredential).mock.calls[0][1];
    expect(replacement.encryptedAccessToken).toMatch(/^v1\./);
    expect(replacement.encryptedRefreshToken).toMatch(/^v1\./);
    expect(JSON.stringify(replacement)).not.toContain("renewed-access");
    expect(JSON.stringify(replacement)).not.toContain("renewed-refresh");
  });

  it("fails closed for missing, disconnected or wrong-environment credentials", async () => {
    const repo = repository();
    vi.mocked(repo.loadCredential).mockResolvedValue(null);
    const service = new MercadoPagoCredentialService(repo, oauth(), key, () => now);
    await expect(service.resolveAccessToken("recipient-1", true)).rejects.toMatchObject({
      code: "mercado-pago-recipient-not-connected",
    });

    vi.mocked(repo.loadCredential).mockResolvedValue(await record({
      disconnectedAt: "2026-08-24T19:00:00.000Z",
    }));
    await expect(service.resolveAccessToken("recipient-1", true)).rejects.toMatchObject({
      code: "mercado-pago-recipient-not-connected",
    });

    vi.mocked(repo.loadCredential).mockResolvedValue(await record({ liveMode: false }));
    await expect(service.resolveAccessToken("recipient-1", true)).rejects.toMatchObject({
      code: "mercado-pago-credential-environment-mismatch",
    });
  });
});
