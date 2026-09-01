import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  OrganizationRepository,
  PublicOrganizationRecord,
} from '@/data/repositories/organization.repository';

type PublicOrganizationRow = {
  id: string;
  slug: string | null;
  name: string | null;
  public_email: string | null;
  avatar_url: string | null;
  marketplace_logo_url: string | null;
  description: string | null;
  primary_category: string | null;
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
  verified: boolean | null;
  is_founder: boolean | null;
};

const PUBLIC_ORGANIZATION_COLUMNS = [
  'id',
  'slug',
  'name',
  'public_email',
  'avatar_url',
  'marketplace_logo_url',
  'description',
  'primary_category',
  'goal',
  'objectives',
  'youtube_url',
  'cover_image_url',
  'instagram',
  'phone',
  'cnpj',
  'address',
  'latitude',
  'longitude',
  'geocoded_address',
  'verified',
  'is_founder',
].join(', ');

const text = (value: string | null): string => value?.trim() ?? '';

const toDomain = (row: PublicOrganizationRow): PublicOrganizationRecord => ({
  id: row.id,
  slug: text(row.slug),
  name: text(row.name),
  publicEmail: text(row.public_email),
  avatarUrl: text(row.avatar_url),
  marketplaceLogoUrl: text(row.marketplace_logo_url),
  description: text(row.description),
  primaryCategory: text(row.primary_category),
  goal: text(row.goal),
  objectives: row.objectives,
  youtubeUrl: text(row.youtube_url),
  coverImageUrl: text(row.cover_image_url),
  instagram: text(row.instagram),
  phone: text(row.phone),
  cnpj: text(row.cnpj),
  address: text(row.address),
  latitude: row.latitude,
  longitude: row.longitude,
  geocodedAddress: text(row.geocoded_address),
  verified: row.verified === true,
  isFounder: row.is_founder === true,
});

export class SupabaseOrganizationRepository implements OrganizationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPublic(): Promise<PublicOrganizationRecord[]> {
    const { data, error } = await this.client
      .from('public_organizations')
      .select(PUBLIC_ORGANIZATION_COLUMNS)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return ((data ?? []) as unknown as PublicOrganizationRow[]).map(toDomain);
  }
}

