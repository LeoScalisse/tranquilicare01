import { supabase } from '@/lib/supabase';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('unsupported-image');
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error('image-too-large');
};

export const uploadNgoCover = async (file: File, userId: string): Promise<string> => {
  validateProfileImage(file);
  const optimized = await imageToWebp(file, 1920, 1080);
  if (!supabase) return blobToDataUrl(optimized);

  const uniqueId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/covers/${uniqueId}.webp`;
  const { error } = await supabase.storage.from('profile-media').upload(path, optimized, {
    cacheControl: '31536000',
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('profile-media').getPublicUrl(path);
  if (!data.publicUrl) throw new Error('missing-public-url');
  return data.publicUrl;
};

