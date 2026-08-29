import { supabase } from '@/lib/supabase';
import { SupabaseMediaStorage } from '@/data/supabase/supabase-media-storage';

const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const PROFILE_AVATAR_SIZE = 512;
const PROFILE_SOURCE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const imageToWebp = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('canvas-unavailable'));
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(objectUrl);
      if (blob) resolve(blob);
      else reject(new Error('image-encoding-failed'));
    }, 'image/webp', 0.84);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };
  image.src = objectUrl;
});

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error ?? new Error('file-read-failed'));
  reader.readAsDataURL(blob);
});

export const validateProfileImage = (file: File) => {
  if (!PROFILE_SOURCE_IMAGE_TYPES.includes(file.type)) {
    throw new Error('unsupported-image');
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) throw new Error('image-too-large');
};

export const profileImageErrorMessage = (error: unknown): string => {
  const code = error instanceof Error ? error.message : '';
  if (code === 'unsupported-image') return 'Use uma imagem JPEG, PNG, WEBP ou HEIC.';
  if (code === 'image-too-large') return 'A imagem original pode ter até 20 MB.';
  if (code === 'invalid-image') return 'Não foi possível ler essa imagem. Tente outro arquivo.';
  return 'Não foi possível salvar a imagem. Tente novamente.';
};

const imageToAvatarWebp = (file: File): Promise<Blob> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = PROFILE_AVATAR_SIZE;
    canvas.height = PROFILE_AVATAR_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('canvas-unavailable'));
      return;
    }
    context.imageSmoothingQuality = 'high';

    const scale = Math.max(PROFILE_AVATAR_SIZE / image.width, PROFILE_AVATAR_SIZE / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    context.drawImage(
      image,
      (PROFILE_AVATAR_SIZE - width) / 2,
      (PROFILE_AVATAR_SIZE - height) / 2,
      width,
      height,
    );
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(objectUrl);
      if (blob) resolve(blob);
      else reject(new Error('image-encoding-failed'));
    }, 'image/webp', 0.82);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('invalid-image'));
  };
  image.src = objectUrl;
});

/**
 * Stores a compact avatar in Storage and returns its URL. The database and
 * auth metadata receive only that URL, never an embedded base64 image.
 */
export const uploadProfileAvatar = async (file: File, userId: string): Promise<string> => {
  validateProfileImage(file);
  const optimized = await imageToAvatarWebp(file);
  if (!supabase) return blobToDataUrl(optimized);

  const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/avatars/${uniqueId}.webp`;
  const storage = new SupabaseMediaStorage(supabase, 'profile-media');
  const stored = await storage.uploadImage({
    storageKey: path,
    body: optimized,
    contentType: 'image/webp',
    cacheControl: '31536000',
  });
  return stored.publicUrl;
};

export const uploadNgoCover = async (file: File, userId: string): Promise<string> => {
  validateProfileImage(file);
  const optimized = await imageToWebp(file, 1920, 1080);
  if (!supabase) return blobToDataUrl(optimized);

  const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/covers/${uniqueId}.webp`;
  const storage = new SupabaseMediaStorage(supabase, 'profile-media');
  const stored = await storage.uploadImage({
    storageKey: path,
    body: optimized,
    contentType: 'image/webp',
    cacheControl: '31536000',
  });
  return stored.publicUrl;
};
