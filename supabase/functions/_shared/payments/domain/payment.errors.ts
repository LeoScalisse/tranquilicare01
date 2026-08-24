export class PaymentError extends Error {
  readonly cause?: unknown;

  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 400,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'PaymentError';
    this.cause = options?.cause;
  }
}

export class PaymentProviderError extends PaymentError {
  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(code, message, 502, options);
    this.name = 'PaymentProviderError';
  }
}

export class PaymentProviderNotConfiguredError extends PaymentError {
  constructor(provider: string) {
    super('provider-not-configured', `Payment provider ${provider} is not configured`, 503);
    this.name = 'PaymentProviderNotConfiguredError';
  }
}
