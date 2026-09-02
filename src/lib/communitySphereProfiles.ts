import { supabase } from '@/lib/supabase';

export type CommunityProfileType = 'donor' | 'organization';

export interface CommunitySphereProfile {
  id: string;
  name: string;
  avatarUrl: string;
  profileType: CommunityProfileType;
}

interface CommunitySphereProfileRow {
  profile_key?: unknown;
  display_name?: unknown;
  avatar_url?: unknown;
  profile_type?: unknown;
}

const safeText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const safeAvatarUrl = (value: unknown): string | null => {
  const candidate = safeText(value);
  if (!candidate) return null;
  if (candidate.startsWith('/')) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const isTranquiliCare = (profile: CommunitySphereProfile) => (
  profile.profileType === 'organization'
  && profile.name.toLocaleLowerCase('pt-BR').replace(/[^a-z]/g, '').includes('tranquilicare')
);

export const interleaveCommunityProfiles = (
  profiles: CommunitySphereProfile[],
): CommunitySphereProfile[] => {
  const donors = profiles.filter((profile) => profile.profileType === 'donor');
  const organizations = profiles
    .filter((profile) => profile.profileType === 'organization')
    .sort((left, right) => Number(isTranquiliCare(right)) - Number(isTranquiliCare(left)));
  const mixed: CommunitySphereProfile[] = [];
  const length = Math.max(donors.length, organizations.length);

  for (let index = 0; index < length; index += 1) {
    if (donors[index]) mixed.push(donors[index]);
    if (organizations[index]) mixed.push(organizations[index]);
  }
  return mixed;
};

export const loadCommunitySphereProfiles = async (
  limit = 36,
): Promise<CommunitySphereProfile[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('list_public_community_sphere_profiles', {
    profile_limit: Math.max(1, Math.min(limit, 60)),
  });
  if (error || !Array.isArray(data)) return [];

  const seen = new Set<string>();
  const profiles = (data as CommunitySphereProfileRow[]).flatMap((row): CommunitySphereProfile[] => {
    const id = safeText(row.profile_key);
    const name = safeText(row.display_name);
    const avatarUrl = safeAvatarUrl(row.avatar_url);
    const profileType = row.profile_type === 'donor' || row.profile_type === 'organization'
      ? row.profile_type
      : null;
    if (!id || !name || !avatarUrl || !profileType || seen.has(id)) return [];
    seen.add(id);
    return [{ id, name, avatarUrl, profileType }];
  });

  return interleaveCommunityProfiles(profiles);
};
