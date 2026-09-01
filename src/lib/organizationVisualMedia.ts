import { CanvasLogoProcessor } from '@/data/browser/canvas-logo-processor';
import { SupabaseLogoProcessor } from '@/data/supabase/supabase-logo-processor';
import { SupabaseMediaStorage } from '@/data/supabase/supabase-media-storage';
import { selectMarketplaceImage } from '@/domain/media/marketplace-image-selector';
import type { StoredMedia } from '@/domain/media/media-storage';
import { supabase } from '@/lib/supabase';

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_WIDTH = 1800;
const PHOTO_MAX_HEIGHT = 1350;

export interface VisualMediaInput {
  userId: string;
  logoFile: File | null;
  photoFiles: File[];
  selectedPhotoIndex?: number;
}

export interface VisualMediaResult {
  profileLogoUrl: string | null;
  marketplaceLogoUrl: string | null;
  coverUrl: string | null;
  selectedPhotoIndex: number;
  logoProcessingFallback: boolean;
}

interface AnalyzedImage {
  blob: Blob;
  width: number;
  height: number;
  sharpness: number;
}

const validateImage = (file: File) => {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('unsupported-image');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('image-too-large');
};

const loadImage = (file: Blob): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };
  image.src = objectUrl;
});

const canvasToWebp = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('image-encoding-failed')), 'image/webp', 0.86);
});

const estimateSharpness = (data: Uint8ClampedArray, width: number, height: number) => {
  if (width < 3 || height < 3) return 0.5;
  const stride = Math.max(1, Math.floor(Math.min(width, height) / 180));
  let total = 0;
  let samples = 0;
  const luminance = (pixel: number) => (
    data[pixel] * 0.2126 + data[pixel + 1] * 0.7152 + data[pixel + 2] * 0.0722
  );
  for (let y = stride; y < height - stride; y += stride) {
    for (let x = stride; x < width - stride; x += stride) {
      const center = (y * width + x) * 4;
      const right = (y * width + x + stride) * 4;
      const below = ((y + stride) * width + x) * 4;
      total += Math.abs(luminance(center) - luminance(right));
      total += Math.abs(luminance(center) - luminance(below));
      samples += 2;
    }
  }
  return Math.min(1, total / Math.max(1, samples) / 42);
};

const preparePhoto = async (file: File): Promise<AnalyzedImage> => {
  validateImage(file);
  const image = await loadImage(file);
  const scale = Math.min(1, PHOTO_MAX_WIDTH / image.naturalWidth, PHOTO_MAX_HEIGHT / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('canvas-unavailable');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  const sharpness = estimateSharpness(context.getImageData(0, 0, width, height).data, width, height);
  return { blob: await canvasToWebp(canvas), width, height, sharpness };
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result ?? ''));
  reader.onerror = () => reject(reader.error ?? new Error('file-read-failed'));
  reader.readAsDataURL(blob);
});

const uniqueId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const extensionFor = (file: File) => {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
};

const recordMedia = async (
  userId: string,
  purpose: 'logo_original' | 'logo_processed' | 'marketplace_photo',
  stored: StoredMedia,
  details: { width?: number; height?: number; metadata?: Record<string, unknown> } = {},
) => {
  if (!supabase) return;
  const { error } = await supabase.from('media_assets').insert({
    owner_profile_id: userId,
    organization_id: userId,
    purpose,
    provider: stored.provider,
    bucket: stored.bucket,
    storage_key: stored.storageKey,
    external_url: stored.publicUrl,
    media_type: 'image',
    visibility: purpose === 'logo_original' ? 'private' : 'public',
    mime_type: stored.mimeType,
    width: details.width ?? null,
    height: details.height ?? null,
    file_size_bytes: stored.fileSizeBytes,
    metadata: details.metadata ?? {},
  });
  if (error) throw error;
};

const upload = async (
  userId: string,
  folder: string,
  blob: Blob,
  contentType: string,
  extension: string,
  bucket = 'profile-media',
) => {
  if (!supabase) {
    return {
      provider: 'external' as const,
      bucket,
      storageKey: `${userId}/${folder}/${uniqueId()}.${extension}`,
      publicUrl: await blobToDataUrl(blob),
      mimeType: contentType,
      fileSizeBytes: blob.size,
    };
  }
  const storage = new SupabaseMediaStorage(supabase, bucket);
  return storage.uploadImage({
    storageKey: `${userId}/${folder}/${uniqueId()}.${extension}`,
    body: blob,
    contentType,
    cacheControl: '31536000',
  });
};

export const analyzeMarketplacePhotoFiles = async (files: File[]) => {
  const analyzed = await Promise.all(files.map(async (file, index) => {
    try {
      const image = await loadImage(file);
      return { id: String(index), width: image.naturalWidth, height: image.naturalHeight };
    } catch {
      return { id: String(index), width: 0, height: 0 };
    }
  }));
  const selected = selectMarketplaceImage(analyzed);
  return selected ? Number(selected.id) : 0;
};

export const prepareOrganizationVisualMedia = async ({
  userId,
  logoFile,
  photoFiles,
  selectedPhotoIndex,
}: VisualMediaInput): Promise<VisualMediaResult> => {
  const photos = photoFiles.slice(0, 3);
  let profileLogoUrl: string | null = null;
  let marketplaceLogoUrl: string | null = null;
  let logoProcessingFallback = false;

  if (logoFile) {
    validateImage(logoFile);
    const original = await upload(
      userId,
      'logos/original',
      logoFile,
      logoFile.type,
      extensionFor(logoFile),
      'organization-media-originals',
    );
    await recordMedia(userId, 'logo_original', original, { metadata: { variant: 'original' } });

    const profileLogo = await upload(
      userId,
      'logos/profile',
      logoFile,
      logoFile.type,
      extensionFor(logoFile),
    );
    profileLogoUrl = profileLogo.publicUrl;

    try {
      let processed;
      try {
        if (!supabase) throw new Error('remote-processor-unavailable');
        processed = await new SupabaseLogoProcessor(supabase, userId).processLogo(logoFile);
      } catch {
        processed = await new CanvasLogoProcessor().processLogo(logoFile);
      }
      const stored = await upload(userId, 'logos/processed', processed.blob, processed.contentType, 'png');
      await recordMedia(userId, 'logo_processed', stored, {
        width: processed.width,
        height: processed.height,
        metadata: { variant: 'background_removed', processor: 'provider-or-browser-v1' },
      });
      marketplaceLogoUrl = stored.publicUrl;
    } catch {
      logoProcessingFallback = true;
      await recordMedia(userId, 'logo_processed', profileLogo, {
        metadata: { variant: 'original_fallback', processor: 'fallback' },
      });
      marketplaceLogoUrl = profileLogo.publicUrl;
    }
  }

  const analyzedPhotos = await Promise.all(photos.map(preparePhoto));
  const automaticSelection = selectMarketplaceImage(analyzedPhotos.map((photo, index) => ({
    id: String(index),
    width: photo.width,
    height: photo.height,
    sharpness: photo.sharpness,
  })));
  const automaticIndex = automaticSelection ? Number(automaticSelection.id) : 0;
  const primaryIndex = selectedPhotoIndex !== undefined && analyzedPhotos[selectedPhotoIndex]
    ? selectedPhotoIndex
    : automaticIndex;

  const storedPhotos = await Promise.all(analyzedPhotos.map(async (photo, index) => {
    const stored = await upload(userId, 'marketplace', photo.blob, 'image/webp', 'webp');
    await recordMedia(userId, 'marketplace_photo', stored, {
      width: photo.width,
      height: photo.height,
      metadata: {
        selected: index === primaryIndex,
        debutStoryCandidate: true,
        sharpness: photo.sharpness,
        focalPoint: { x: 0.5, y: 0.5 },
        selector: 'objective-rules-v1',
      },
    });
    return stored;
  }));

  return {
    profileLogoUrl,
    marketplaceLogoUrl,
    coverUrl: storedPhotos[primaryIndex]?.publicUrl ?? storedPhotos[0]?.publicUrl ?? null,
    selectedPhotoIndex: primaryIndex,
    logoProcessingFallback,
  };
};

export const markOrganizationVisualSetupReady = async (userId: string, authorized: boolean) => {
  if (!supabase) return;
  const { error } = await supabase.rpc('complete_own_organization_visual_setup', {
    target_organization_id: userId,
    media_authorized: authorized,
  });
  if (error) throw error;
};

export const visualMediaErrorMessage = (error: unknown) => {
  const code = error instanceof Error ? error.message : '';
  if (code === 'unsupported-image') return 'Use imagens JPEG, PNG ou WEBP.';
  if (code === 'image-too-large') return 'Cada imagem original pode ter até 20 MB.';
  if (code === 'invalid-image') return 'Não foi possível ler uma das imagens.';
  return 'Não foi possível salvar todas as imagens. Tente novamente.';
};
