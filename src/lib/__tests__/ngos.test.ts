import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  listPublic: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));

vi.mock('@/data/supabase/supabase-organization.repository', () => ({
  SupabaseOrganizationRepository: class {
    listPublic = repositoryMocks.listPublic;
  },
}));

import { loadMarketplaceNgos, ngoFromUser } from '@/lib/ngos';
import type { AppUser } from '@/lib/authTypes';
import type { PublicOrganizationRecord } from '@/data/repositories/organization.repository';

const organization = (status: 'pending' | 'approved'): AppUser => ({
  id: 'ngo-real',
  email: 'contato@causareal.org',
  name: 'Causa Real',
  avatar: null,
  credits: 0,
  accountType: 'ngo',
  ngoProfile: {
    publicEmail: 'contato@causareal.org',
    description: 'Uma causa cadastrada no Supabase.',
    category: 'Educação',
    goal: 'Abrir uma nova turma.',
    objectives: [],
    youtubeUrl: '',
    coverImage: 'https://example.com/cover.webp',
    instagram: '',
    phone: '',
    cnpj: '11222333000181',
    address: 'Rua das Flores, 120, São Paulo - SP',
    latitude: -23.55052,
    longitude: -46.633308,
    geocodedAddress: 'Rua das Flores, 120, São Paulo, SP, Brasil',
    status,
  },
});

describe('ngoFromUser', () => {
  beforeEach(() => {
    repositoryMocks.listPublic.mockReset();
  });

  it('keeps a pending owner visible without claiming verification', () => {
    const ngo = ngoFromUser(organization('pending'));
    expect(ngo?.id).toBe('ngo-real');
    expect(ngo?.verified).toBe(false);
    expect(ngo?.latitude).toBe(-23.55052);
    expect(ngo?.coverImage).toBe('https://example.com/cover.webp');
  });

  it('marks only the approved database status as verified', () => {
    expect(ngoFromUser(organization('approved'))?.verified).toBe(true);
  });

  it('returns only persisted organizations after a successful marketplace query', async () => {
    const persisted: PublicOrganizationRecord = {
      id: 'org-persisted',
      slug: 'instituto-horizonte',
      name: 'Instituto Horizonte',
      publicEmail: 'contato@horizonte.org',
      avatarUrl: '/horizonte.png',
      marketplaceLogoUrl: '/horizonte-sem-fundo.png',
      description: 'Educação para jovens.',
      primaryCategory: 'Educação',
      goal: 'Abrir uma turma.',
      objectives: [],
      youtubeUrl: '',
      coverImageUrl: 'https://example.com/marketplace-cover.webp',
      instagram: '',
      phone: '',
      cnpj: '11222333000181',
      address: 'Rua das Flores, 120',
      latitude: -23.55052,
      longitude: -46.633308,
      geocodedAddress: 'Rua das Flores, 120, São Paulo, SP, Brasil',
      verified: true,
      isFounder: false,
    };
    repositoryMocks.listPublic.mockResolvedValue([persisted]);

    const result = await loadMarketplaceNgos();

    expect(result.map((ngo) => ngo.id)).toEqual(['org-persisted']);
    expect(result[0].coverImage).toBe('https://example.com/marketplace-cover.webp');
    expect(result[0].marketplaceLogo).toBe('/horizonte-sem-fundo.png');
  });

  it('keeps a successful empty marketplace empty', async () => {
    repositoryMocks.listPublic.mockResolvedValue([]);

    await expect(loadMarketplaceNgos()).resolves.toEqual([]);
  });
});

