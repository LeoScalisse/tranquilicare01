import type { NgoProfileDetails } from './authTypes';

const preferText = (canonical: string, compatibility: string): string =>
  canonical.trim() || compatibility.trim();

/**
 * During the structured-profile migration, older saves could reach
 * `profiles.ngo_profile` before the canonical `ngo_profiles` write failed.
 * Preserve those real persisted values when the canonical column is empty,
 * while keeping protected status exclusively under canonical control.
 */
export const mergeNgoProfileSources = (
  compatibility: NgoProfileDetails | null,
  canonical: NgoProfileDetails,
  accountEmail: string,
): NgoProfileDetails => {
  const legacy = compatibility ?? {
    publicEmail: '',
    description: '',
    category: '',
    goal: '',
    objectives: [],
    youtubeUrl: '',
    coverImage: '',
    instagram: '',
    phone: '',
    cnpj: '',
    address: '',
    latitude: null,
    longitude: null,
    geocodedAddress: '',
    status: 'pending' as const,
    profileStatus: 'not_started' as const,
    verificationStatus: 'pending' as const,
    payoutStatus: 'not_configured' as const,
    paymentStatus: 'disabled' as const,
  };

  return {
    publicEmail: preferText(canonical.publicEmail, legacy.publicEmail) || accountEmail,
    description: preferText(canonical.description, legacy.description),
    category: preferText(canonical.category, legacy.category),
    goal: preferText(canonical.goal, legacy.goal),
    objectives: canonical.objectives.length > 0 ? canonical.objectives : legacy.objectives,
    youtubeUrl: preferText(canonical.youtubeUrl, legacy.youtubeUrl),
    coverImage: preferText(canonical.coverImage, legacy.coverImage),
    instagram: preferText(canonical.instagram, legacy.instagram),
    phone: preferText(canonical.phone, legacy.phone),
    cnpj: preferText(canonical.cnpj, legacy.cnpj),
    address: preferText(canonical.address, legacy.address),
    latitude: canonical.latitude ?? legacy.latitude,
    longitude: canonical.longitude ?? legacy.longitude,
    geocodedAddress: preferText(canonical.geocodedAddress ?? '', legacy.geocodedAddress ?? ''),
    status: canonical.status,
    profileStatus: canonical.profileStatus,
    verificationStatus: canonical.verificationStatus,
    payoutStatus: canonical.payoutStatus,
    paymentStatus: canonical.paymentStatus,
    isFounder: canonical.isFounder === true,
  };
};
