export interface PublicOrganizationRecord {
  id: string;
  slug: string;
  name: string;
  publicEmail: string;
  avatarUrl: string;
  marketplaceLogoUrl: string;
  description: string;
  primaryCategory: string;
  goal: string;
  objectives: unknown;
  youtubeUrl: string;
  coverImageUrl: string;
  instagram: string;
  phone: string;
  cnpj: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geocodedAddress: string;
  verified: boolean;
  isFounder: boolean;
  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'archived';
  donationsEnabled: boolean;
}

export interface OrganizationRepository {
  listPublic(): Promise<PublicOrganizationRecord[]>;
}

