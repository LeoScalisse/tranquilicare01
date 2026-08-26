import { describe, expect, it } from 'vitest';

import { ngoFromUser } from '@/lib/ngos';
import type { AppUser } from '@/lib/authTypes';

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
  it('keeps a pending owner visible without claiming verification', () => {
    const ngo = ngoFromUser(organization('pending'));
    expect(ngo?.id).toBe('ngo-real');
    expect(ngo?.verified).toBe(false);
    expect(ngo?.latitude).toBe(-23.55052);
  });

  it('marks only the approved database status as verified', () => {
    expect(ngoFromUser(organization('approved'))?.verified).toBe(true);
  });
});

