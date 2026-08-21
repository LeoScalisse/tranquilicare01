import { demoNgos } from '@/data/demoNgos';
import type { AppUser } from '@/lib/authTypes';
import { supabase } from '@/lib/supabase';
import type { NGO } from '@/types';

type PublicNgoRow = {
  user_id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  description: string | null;
  category: string | null;
  goal: string | null;
  objectives: unknown;
  youtube_url: string | null;
  cover_image_url: string | null;
  instagram: string | null;
  phone: string | null;
  cnpj: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_address: string | null;
  status: 'approved';
};

const stringArray = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  : [];

const rowToNgo = (row: PublicNgoRow): NGO => ({
  id: row.user_id,
  name: row.name?.trim() || 'Organização',
  description: row.description?.trim() || '',
  category: row.category?.trim() || 'Outros',
  goal: row.goal?.trim() || '',
  objectives: stringArray(row.objectives),
  causeVideo: row.youtube_url?.trim() || undefined,
  image: row.avatar_url?.trim() || '/favicon.png',
  coverImage: row.cover_image_url?.trim() || undefined,
  email: row.email?.trim() || '',
  instagram: row.instagram?.trim() || '',
  phone: row.phone?.trim() || undefined,
  cnpj: row.cnpj?.trim() || undefined,
  address: row.address?.trim() || undefined,
  latitude: row.latitude,
  longitude: row.longitude,
  geocodedAddress: row.geocoded_address?.trim() || undefined,
  verified: true,
  status: 'approved',
  posts: [],
});

export const ngoFromUser = (user: AppUser): NGO | null => {
  const details = user.ngoProfile;
  if (user.accountType !== 'ngo' || !details?.description.trim() || !details.category.trim() || !details.goal.trim()) return null;
  const status = details.status ?? 'pending';
  return {
    id: user.id,
    name: user.name.trim() || 'Organização',
    description: details.description.trim(),
    category: details.category.trim(),
    goal: details.goal.trim(),
    objectives: details.objectives,
    causeVideo: details.youtubeUrl.trim() || undefined,
    image: user.avatar || '/favicon.png',
    coverImage: details.coverImage.trim() || undefined,
    email: user.email,
    instagram: details.instagram.trim(),
    phone: details.phone.trim() || undefined,
    cnpj: details.cnpj.trim() || undefined,
    address: details.address.trim() || undefined,
    latitude: details.latitude ?? null,
    longitude: details.longitude ?? null,
    geocodedAddress: details.geocodedAddress?.trim() || undefined,
    verified: status === 'approved',
    status,
    posts: [],
  };
};

export const loadMarketplaceNgos = async (viewer?: AppUser | null): Promise<NGO[]> => {
  const ownerNgo = viewer ? ngoFromUser(viewer) : null;
  if (!supabase) return ownerNgo
    ? [ownerNgo, ...demoNgos.filter((ngo) => ngo.id !== ownerNgo.id)]
    : demoNgos;

  const { data, error } = await supabase.rpc('list_public_ngos');
  if (error) {
    console.error('Could not load public organizations:', error);
    return ownerNgo
      ? [ownerNgo, ...demoNgos.filter((ngo) => ngo.id !== ownerNgo.id)]
      : demoNgos;
  }

  const publicNgos = ((data ?? []) as PublicNgoRow[]).map(rowToNgo);
  const merged = ownerNgo
    ? [ownerNgo, ...publicNgos.filter((ngo) => ngo.id !== ownerNgo.id)]
    : publicNgos;
  const knownIds = new Set(merged.map((ngo) => ngo.id));
  return [...merged, ...demoNgos.filter((ngo) => !knownIds.has(ngo.id))];
};

export const loadNgoById = async (ngoId: string, viewer?: AppUser | null): Promise<NGO | null> => {
  const demo = demoNgos.find((ngo) => ngo.id === ngoId);
  if (demo) return demo;
  const owner = viewer ? ngoFromUser(viewer) : null;
  if (owner?.id === ngoId) return owner;
  const ngos = await loadMarketplaceNgos(viewer);
  return ngos.find((ngo) => ngo.id === ngoId) ?? null;
};

