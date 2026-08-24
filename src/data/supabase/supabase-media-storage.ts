import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  FileReference,
  MediaStorage,
  StoredMedia,
  UploadImageInput,
} from '@/domain/media/media-storage';

export class SupabaseMediaStorage implements MediaStorage {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {}

  async uploadImage(input: UploadImageInput): Promise<StoredMedia> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(input.storageKey, input.body, {
        cacheControl: input.cacheControl ?? '31536000',
        contentType: input.contentType,
        upsert: false,
      });
    if (error) throw error;

    return {
      provider: 'supabase',
      bucket: this.bucket,
      storageKey: input.storageKey,
      publicUrl: this.getPublicUrl({ bucket: this.bucket, storageKey: input.storageKey }),
      mimeType: input.contentType,
      fileSizeBytes: input.body.size,
    };
  }

  async deleteFile(input: FileReference): Promise<void> {
    const { error } = await this.client.storage.from(input.bucket).remove([input.storageKey]);
    if (error) throw error;
  }

  getPublicUrl(input: FileReference): string {
    const { data } = this.client.storage.from(input.bucket).getPublicUrl(input.storageKey);
    if (!data.publicUrl) throw new Error('missing-public-url');
    return data.publicUrl;
  }

  async getSignedUrl(input: FileReference, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(input.bucket)
      .createSignedUrl(input.storageKey, expiresInSeconds);
    if (error) throw error;
    if (!data.signedUrl) throw new Error('missing-signed-url');
    return data.signedUrl;
  }
}

