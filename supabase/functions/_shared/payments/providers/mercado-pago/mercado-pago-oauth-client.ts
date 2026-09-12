// The Brazilian marketplace endpoint avoids the country-selection hop used by
// the generic host. That hop can discard OAuth state before returning to us.
const AUTHORIZATION_URL = "https://auth.mercadopago.com.br/authorization";
const TOKEN_URL = "https://api.mercadopago.com/oauth/token";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface MercadoPagoOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface MercadoPagoOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  publicKey: string | null;
  providerUserId: string;
  liveMode: boolean;
  expiresInSeconds: number;
  tokenType: string;
  scopes: string[];
}

interface TokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  public_key?: unknown;
  user_id?: unknown;
  live_mode?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  scope?: unknown;
}

const encodeBase64Url = (value: Uint8Array): string => {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const randomBase64Url = (bytes = 32): string =>
  encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));

const sha256 = async (value: string): Promise<Uint8Array> =>
  new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );

export const createPkcePair = async (): Promise<{
  verifier: string;
  challenge: string;
}> => {
  const verifier = randomBase64Url();
  return { verifier, challenge: encodeBase64Url(await sha256(verifier)) };
};

export const createOAuthState = (): string => randomBase64Url();

export const hashOAuthState = async (state: string): Promise<string> =>
  Array.from(await sha256(state), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const parseCredentials = (payload: TokenResponse): MercadoPagoOAuthCredentials => {
  if (
    typeof payload.access_token !== "string" ||
    typeof payload.refresh_token !== "string" ||
    (typeof payload.user_id !== "string" && typeof payload.user_id !== "number") ||
    typeof payload.expires_in !== "number" ||
    payload.expires_in <= 0
  ) {
    throw new Error("mercado-pago-oauth-response-invalid");
  }
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    publicKey: typeof payload.public_key === "string" ? payload.public_key : null,
    providerUserId: String(payload.user_id),
    liveMode: payload.live_mode === true,
    expiresInSeconds: payload.expires_in,
    tokenType: typeof payload.token_type === "string" ? payload.token_type : "bearer",
    scopes: typeof payload.scope === "string"
      ? payload.scope.split(/\s+/).filter(Boolean)
      : [],
  };
};

export class MercadoPagoOAuthClient {
  constructor(
    private readonly config: MercadoPagoOAuthConfig,
    private readonly request: FetchLike = fetch,
  ) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error("mercado-pago-oauth-config-invalid");
    }
    const redirectUrl = new URL(config.redirectUri);
    if (redirectUrl.protocol !== "https:") {
      throw new Error("mercado-pago-oauth-redirect-invalid");
    }
  }

  buildAuthorizationUrl(input: {
    state: string;
    codeChallenge: string;
  }): string {
    const url = new URL(AUTHORIZATION_URL);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      platform_id: "mp",
      redirect_uri: this.config.redirectUri,
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
    }).toString();
    return url.toString();
  }

  async exchangeAuthorizationCode(input: {
    code: string;
    state: string;
    codeVerifier: string;
  }): Promise<MercadoPagoOAuthCredentials> {
    return await this.requestCredentials({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: this.config.redirectUri,
      state: input.state,
      code_verifier: input.codeVerifier,
    });
  }

  async refreshCredentials(
    refreshToken: string,
  ): Promise<MercadoPagoOAuthCredentials> {
    return await this.requestCredentials({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  private async requestCredentials(
    body: Record<string, string>,
  ): Promise<MercadoPagoOAuthCredentials> {
    let response: Response;
    try {
      response = await this.request(TOKEN_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body).toString(),
      });
    } catch (_cause) {
      throw new Error("mercado-pago-oauth-request-failed");
    }
    if (!response.ok) {
      throw new Error("mercado-pago-oauth-request-failed");
    }
    let payload: TokenResponse;
    try {
      payload = await response.json() as TokenResponse;
    } catch (_cause) {
      throw new Error("mercado-pago-oauth-response-invalid");
    }
    return parseCredentials(payload);
  }
}

export const createMercadoPagoOAuthClient = (
  config: MercadoPagoOAuthConfig,
  request?: FetchLike,
): MercadoPagoOAuthClient => new MercadoPagoOAuthClient(config, request);
