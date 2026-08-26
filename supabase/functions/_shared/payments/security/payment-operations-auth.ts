const digest = async (value: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  ));

const equalBytes = (left: Uint8Array, right: Uint8Array): boolean => {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
};

export const authorizePaymentOperationsRequest = async (
  request: Request,
  configuredSecret: string | null,
): Promise<boolean> => {
  if (!configuredSecret || configuredSecret.length < 32) return false;
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const receivedSecret = authorization.slice("Bearer ".length);
  if (!receivedSecret) return false;
  return equalBytes(
    await digest(receivedSecret),
    await digest(configuredSecret),
  );
};
