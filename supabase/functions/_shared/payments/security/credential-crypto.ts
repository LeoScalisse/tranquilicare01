const ENVELOPE_VERSION = "v1";
const AES_GCM_IV_BYTES = 12;
const AES_256_KEY_BYTES = 32;
const ADDITIONAL_DATA = new TextEncoder().encode(
  "tranquilicare:payment-credential:v1",
);

const fail = (code: string, cause?: unknown): Error => {
  const error = new Error(code);
  if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause;
  return error;
};

const decodeBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const encodeBase64Url = (value: Uint8Array): string => {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const importEncryptionKey = async (encodedKey: string): Promise<CryptoKey> => {
  let rawKey: Uint8Array;
  try {
    rawKey = decodeBase64Url(encodedKey);
  } catch (cause) {
    throw fail("payment-credential-key-invalid", cause);
  }
  if (rawKey.byteLength !== AES_256_KEY_BYTES) {
    throw fail("payment-credential-key-invalid");
  }
  try {
    return await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  } catch (cause) {
    throw fail("payment-credential-key-invalid", cause);
  }
};

export const encryptPaymentCredential = async (
  plaintext: string,
  encodedKey: string,
): Promise<string> => {
  if (!plaintext) throw fail("payment-credential-empty");
  const key = await importEncryptionKey(encodedKey);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: ADDITIONAL_DATA },
    key,
    new TextEncoder().encode(plaintext),
  );
  return [
    ENVELOPE_VERSION,
    encodeBase64Url(iv),
    encodeBase64Url(new Uint8Array(ciphertext)),
  ].join(".");
};

export const decryptPaymentCredential = async (
  envelope: string,
  encodedKey: string,
): Promise<string> => {
  const [version, encodedIv, encodedCiphertext, extra] = envelope.split(".");
  if (
    version !== ENVELOPE_VERSION ||
    !encodedIv ||
    !encodedCiphertext ||
    extra !== undefined
  ) {
    throw fail("payment-credential-envelope-invalid");
  }

  let iv: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    iv = decodeBase64Url(encodedIv);
    ciphertext = decodeBase64Url(encodedCiphertext);
  } catch (cause) {
    throw fail("payment-credential-envelope-invalid", cause);
  }
  if (iv.byteLength !== AES_GCM_IV_BYTES || ciphertext.byteLength <= 16) {
    throw fail("payment-credential-envelope-invalid");
  }

  const key = await importEncryptionKey(encodedKey);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: ADDITIONAL_DATA },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  } catch (cause) {
    throw fail("payment-credential-decryption-failed", cause);
  }
};
