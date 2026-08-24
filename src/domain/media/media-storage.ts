export type MediaStorageProvider = 'supabase' | 'external';

export interface StoredMedia {
  provider: MediaStorageProvider;
  bucket: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface UploadImageInput {
  storageKey: string;
  body: Blob;
  contentType: string;
  cacheControl?: string;
}

export interface FileReference {
  bucket: string;
  storageKey: string;
}

export interface MediaStorage {
  uploadImage(input: UploadImageInput): Promise<StoredMedia>;
  deleteFile(input: FileReference): Promise<void>;
  getPublicUrl(input: FileReference): string;
  getSignedUrl?(input: FileReference, expiresInSeconds: number): Promise<string>;
}

