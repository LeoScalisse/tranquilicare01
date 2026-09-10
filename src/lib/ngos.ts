import { demoNgos } from '@/data/demoNgos';
import {
  TRANQUILICARE_FOUNDER_NGO,
} from '@/data/tranquilicarePrototype';
import type { PublicOrganizationRecord } from '@/data/repositories/organization.repository';
import { SupabaseOrganizationRepository } from '@/data/supabase/supabase-organization.repository';
import type { AppUser } from '@/lib/authTypes';
import { supabase } from '@/lib/supabase';
import type { NGO } from '@/types';
import { demoDataEnabled } from '@/lib/demoData';
import { loadPublishedStories } from '@/lib/stories';
import { INTERNAL_ORGANIZATION_ID } from '@/lib/platformAdmin';

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
  marketplaceLogo: row.marketplaceLogoUrl || undefined,
  coverImage: row.coverImageUrl || undefined,
  email: row.publicEmail,
  instagram: row.instagram,
  phone: row.phone || undefined,
  cnpj: row.cnpj || undefined,
  address: row.address || undefined,
  latitude: row.latitude,
  longitude: row.longitude,
  geocodedAddress: row.geocodedAddress || undefined,
  verified: row.verified,
  status: row.status === 'active' ? 'approved' : row.status === 'rejected' ? 'rejected' : 'pending',
  isFounder: row.isFounder,
  donationsEnabled: row.donationsEnabled,
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
    email: details.publicEmail.trim() || user.email,
    instagram: details.instagram.trim(),
    phone: details.phone.trim() || undefined,
    cnpj: details.cnpj.trim() || undefined,
    address: details.address.trim() || undefined,
    latitude: details.latitude ?? null,
    longitude: details.longitude ?? null,
    geocodedAddress: details.geocodedAddress?.trim() || undefined,
    verified: details.verificationStatus === 'verified',
    status,
    isFounder: details.isFounder === true,
    donationsEnabled: details.paymentStatus === 'enabled'
      && details.verificationStatus === 'verified'
      && details.payoutStatus === 'configured',
    posts: [],
  };
};

export const loadMarketplaceNgos = async (viewer?: AppUser | null): Promise<NGO[]> => {
  const ownerNgo = viewer && viewer.id !== INTERNAL_ORGANIZATION_ID ? ngoFromUser(viewer) : null;
  if (!supabase) {
    const fixtures = demoDataEnabled ? demoNgos : [];
    return ownerNgo
      ? [ownerNgo, ...fixtures.filter((ngo) => ngo.id !== ownerNgo.id)]
      : fixtures;
  }

  let publicNgos: NGO[];
  try {
    const repository = new SupabaseOrganizationRepository(supabase);
    publicNgos = (await repository.listPublic()).filter((row) => row.id !== INTERNAL_ORGANIZATION_ID).map(rowToNgo);
  } catch (error) {
    console.error('Could not load public organizations:', error);
    const fixtures = demoDataEnabled ? demoNgos : [];
    return ownerNgo
      ? [ownerNgo, ...fixtures.filter((ngo) => ngo.id !== ownerNgo.id)]
      : fixtures;
  }

  const merged = ownerNgo
    ? [ownerNgo, ...publicNgos.filter((ngo) => ngo.id !== ownerNgo.id)]
    : publicNgos;
  if (!demoDataEnabled) return merged;
  const knownIds = new Set(merged.map((ngo) => ngo.id));
  return [...merged, ...demoNgos.filter((ngo) => !knownIds.has(ngo.id))];
};

export const loadNgoById = async (ngoId: string, viewer?: AppUser | null): Promise<NGO | null> => {
  if (demoDataEnabled && ngoId === TRANQUILICARE_FOUNDER_NGO.id) return TRANQUILICARE_FOUNDER_NGO;
  if (demoDataEnabled) {
    const demo = demoNgos.find((ngo) => ngo.id === ngoId);
    if (demo) return demo;
  }
  const owner = viewer ? ngoFromUser(viewer) : null;
  if (owner?.id === ngoId) return owner;
  const ngos = await loadMarketplaceNgos(viewer);
  const ngo = ngos.find((candidate) => candidate.id === ngoId) ?? null;
  if (!ngo) return null;
  try {
    const stories = await loadPublishedStories();
    return {
      ...ngo,
      posts: stories
        .filter((story) => story.ngoId === ngo.id)
        .map((story) => ({
          id: story.id,
          url: story.url,
          type: story.type,
          caption: story.caption,
          timestamp: story.timestamp,
          ngoId: story.ngoId ?? undefined,
          ngoName: story.ngoName,
          ngoImage: story.ngoImage,
        })),
    };
  } catch (error) {
    console.error('Could not load organization stories:', error);
    return ngo;
  }
};
