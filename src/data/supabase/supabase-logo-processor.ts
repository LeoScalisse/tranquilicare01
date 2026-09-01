import type { LogoProcessor, ProcessedLogo } from '@/domain/media/logo-processor';

interface EdgeFunctionResponse<T> {
  data: T | null;
  error: unknown;
  response?: Response;
}

export interface EdgeFunctionClient {
  functions: {
    invoke<T = unknown>(
      name: string,
      options: { body: FormData },
    ): Promise<EdgeFunctionResponse<T>>;
  };
}

const dimensionsFromImage = (blob: Blob): Promise<{ width: number; height: number }> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve({ width: image.naturalWidth, height: image.naturalHeight });
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-processed-logo'));
  };
  image.src = objectUrl;
});

const positiveHeader = (response: Response | undefined, name: string) => {
  const value = Number(response?.headers.get(name));
  return Number.isFinite(value) && value > 0 ? value : null;
};

/** Sends the logo through the authenticated provider-neutral Edge Function. */
export class SupabaseLogoProcessor implements LogoProcessor {
  constructor(
    private readonly client: EdgeFunctionClient,
    private readonly organizationId?: string,
  ) {}

  async processLogo(file: File, targetOrganizationId = this.organizationId): Promise<ProcessedLogo> {
    if (!targetOrganizationId) throw new Error('organization-required');
    const form = new FormData();
    form.append('organizationId', targetOrganizationId);
    form.append('image', file, file.name);
    const { data, error, response } = await this.client.functions.invoke<Blob>('process-organization-logo', {
      body: form,
    });
    if (error) throw error;
    if (!(data instanceof Blob) || data.size === 0) throw new Error('invalid-processed-logo');

    const blob = new Blob([data], { type: 'image/png' });
    const headerWidth = positiveHeader(response, 'x-image-width');
    const headerHeight = positiveHeader(response, 'x-image-height');
    const dimensions = headerWidth && headerHeight
      ? { width: headerWidth, height: headerHeight }
      : await dimensionsFromImage(blob);

    return { blob, contentType: 'image/png', ...dimensions };
  }

  removeBackground(file: File): Promise<ProcessedLogo> {
    return this.processLogo(file);
  }
}
