import { demoNgos } from '@/data/demoNgos';
import {
  isTranquiliCarePrototypeAccount,
  isTranquiliCarePrototypeOrganization,
  TRANQUILICARE_FOUNDER_NGO,
  TRANQUILICARE_PROTOTYPE_STORIES,
} from '@/data/tranquilicarePrototype';
import type { PublicOrganizationRecord } from '@/data/repositories/organization.repository';
import { SupabaseOrganizationRepository } from '@/data/supabase/supabase-organization.repository';
import type { AppUser } from '@/lib/authTypes';
import { supabase } from '@/lib/supabase';
import type { NGO } from '@/types';

const stringArray = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  : [];

const rowToNgo = (row: PublicOrganizationRecord): NGO => ({
  id: row.id,
  name: row.name || 'Organização',
  description: row.description,
  category: row.primaryCategory || 'Outros',
  goal: row.goal,
  objectives: stringArray(row.objectives),
  causeVideo: row.youtubeUrl || undefined,
  image: row.avatarUrl || '/favicon.png',
  coverImage: undefined,
  email: row.publicEmail,
  instagram: row.instagram,
  phone: row.phone || undefined,
  cnpj: row.cnpj || undefined,
  address: row.address || undefined,
  latitude: row.latitude,
  longitude: row.longitude,
  geocodedAddress: row.geocodedAddress || undefined,
  verified: row.verified,
  status: 'approved',
  posts: isTranquiliCarePrototypeOrganization({ name: row.name, email: row.publicEmail })
    ? TRANQUILICARE_PROTOTYPE_STORIES
    : [],
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
    coverImage: undefined,
    email: details.publicEmail.trim() || user.email,
    instagram: details.instagram.trim(),
    phone: details.phone.trim() || undefined,
    cnpj: details.cnpj.trim() || undefined,
    address: details.address.trim() || undefined,
    latitude: details.latitude ?? null,
    longitude: details.longitude ?? null,
    geocodedAddress: details.geocodedAddress?.trim() || undefined,
    verified: status === 'approved',
    status,
    posts: isTranquiliCarePrototypeAccount(details.publicEmail) || isTranquiliCarePrototypeAccount(user.email)
      ? TRANQUILICARE_PROTOTYPE_STORIES
      : [],
  };
};

export const loadMarketplaceNgos = async (viewer?: AppUser | null): Promise<NGO[]> => {
  const ownerNgo = viewer ? ngoFromUser(viewer) : null;
  if (!supabase) return ownerNgo
    ? [ownerNgo, ...demoNgos.filter((ngo) => ngo.id !== ownerNgo.id)]
    : demoNgos;

  let publicNgos: NGO[];
  try {
    const repository = new SupabaseOrganizationRepository(supabase);
    publicNgos = (await repository.listPublic()).map(rowToNgo);
  } catch (error) {
    console.error('Could not load public organizations:', error);
    return ownerNgo
      ? [ownerNgo, ...demoNgos.filter((ngo) => ngo.id !== ownerNgo.id)]
      : demoNgos;
  }

  const merged = ownerNgo
    ? [ownerNgo, ...publicNgos.filter((ngo) => ngo.id !== ownerNgo.id)]
    : publicNgos;
  const knownIds = new Set(merged.map((ngo) => ngo.id));
  return [...merged, ...demoNgos.filter((ngo) => !knownIds.has(ngo.id))];
};

export const loadNgoById = async (ngoId: string, viewer?: AppUser | null): Promise<NGO | null> => {
  if (ngoId === TRANQUILICARE_FOUNDER_NGO.id) return TRANQUILICARE_FOUNDER_NGO;
  const demo = demoNgos.find((ngo) => ngo.id === ngoId);
  if (demo) return demo;
  const owner = viewer ? ngoFromUser(viewer) : null;
  if (owner?.id === ngoId) return owner;
  const ngos = await loadMarketplaceNgos(viewer);
  return ngos.find((ngo) => ngo.id === ngoId) ?? null;
};
