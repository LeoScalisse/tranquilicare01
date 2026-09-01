export interface BackgroundRemovalResult {
  body: ArrayBuffer;
  contentType: 'image/png';
}

export interface BackgroundRemovalProvider {
  readonly name: 'photoroom' | 'removebg';
  removeBackground(image: Blob): Promise<BackgroundRemovalResult>;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const pngResult = async (response: Response, provider: BackgroundRemovalProvider['name']) => {
  if (!response.ok) {
    throw new Error(`${provider}-request-failed:${response.status}`);
  }
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`${provider}-invalid-response`);
  }
  return {
    body: await response.arrayBuffer(),
    contentType: 'image/png' as const,
  };
};

export class PhotoRoomBackgroundRemovalProvider implements BackgroundRemovalProvider {
  readonly name = 'photoroom' as const;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async removeBackground(image: Blob): Promise<BackgroundRemovalResult> {
    const form = new FormData();
    form.append('image_file', image, image instanceof File ? image.name : 'logo');
    form.append('format', 'png');
    form.append('channels', 'rgba');
    const response = await this.fetchImpl('https://sdk.photoroom.com/v1/segment', {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey },
      body: form,
    });
    return pngResult(response, this.name);
  }
}

export class RemoveBgBackgroundRemovalProvider implements BackgroundRemovalProvider {
  readonly name = 'removebg' as const;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async removeBackground(image: Blob): Promise<BackgroundRemovalResult> {
    const form = new FormData();
    form.append('image_file', image, image instanceof File ? image.name : 'logo');
    form.append('type', 'graphic');
    form.append('size', 'auto');
    form.append('format', 'png');
    const response = await this.fetchImpl('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': this.apiKey },
      body: form,
    });
    return pngResult(response, this.name);
  }
}

export const createBackgroundRemovalProvider = (
  providerName: string,
  secrets: { photoRoomApiKey?: string; removeBgApiKey?: string },
): BackgroundRemovalProvider => {
  if (providerName === 'removebg') {
    if (!secrets.removeBgApiKey) throw new Error('removebg-not-configured');
    return new RemoveBgBackgroundRemovalProvider(secrets.removeBgApiKey);
  }
  if (!secrets.photoRoomApiKey) throw new Error('photoroom-not-configured');
  return new PhotoRoomBackgroundRemovalProvider(secrets.photoRoomApiKey);
};
