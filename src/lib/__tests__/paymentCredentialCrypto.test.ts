import { describe, expect, it } from "vitest";

import {
  decryptPaymentCredential,
  encryptPaymentCredential,
} from "../../../supabase/functions/_shared/payments/security/credential-crypto.ts";

const key = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

describe("payment credential encryption", () => {
  it("round-trips a credential without exposing it in the envelope", async () => {
    const plaintext = "APP_USR-sensitive-oauth-token";
    const envelope = await encryptPaymentCredential(plaintext, key);
    expect(envelope).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(envelope).not.toContain(plaintext);
    await expect(decryptPaymentCredential(envelope, key)).resolves.toBe(plaintext);
  });

  it("rejects a tampered authenticated envelope", async () => {
    const envelope = await encryptPaymentCredential("refresh-token", key);
    const [version, iv, ciphertext] = envelope.split(".");
    const tamperedCiphertext = `${ciphertext.startsWith("A") ? "B" : "A"}${ciphertext.slice(1)}`;
    const tampered = `${version}.${iv}.${tamperedCiphertext}`;
    await expect(decryptPaymentCredential(tampered, key)).rejects.toThrow(
      "payment-credential-decryption-failed",
    );
  });

  it("rejects keys that are not exactly 32 bytes", async () => {
    await expect(
      encryptPaymentCredential("token", "dG9vLXNob3J0"),
    ).rejects.toThrow("payment-credential-key-invalid");
  });

  it("rejects malformed or unsupported envelopes", async () => {
    await expect(decryptPaymentCredential("v2.bad.payload", key)).rejects.toThrow(
      "payment-credential-envelope-invalid",
    );
  });
});