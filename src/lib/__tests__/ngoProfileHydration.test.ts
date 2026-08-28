import { describe, expect, it } from 'vitest';

import { mergeNgoProfileSources } from '@/lib/ngoProfileHydration';

describe('organization profile hydration', () => {
  it('does not erase previously persisted values with empty canonical columns', () => {
    const merged = mergeNgoProfileSources(
      {
        publicEmail: 'tranquilimaiscare@gmail.com',
        description: 'A ponte que conecta pessoas e organizações.',
        category: 'Social',
        goal: 'Fazer a diferença.',
        objectives: [],
        youtubeUrl: '',
        coverImage: '',
        instagram: 'tranquilicare',
        phone: '11950845288',
        cnpj: '14380200000121',
        address: 'Rua Euclides Pacheco 803',
        latitude: -23.55,
        longitude: -46.63,
        geocodedAddress: 'Rua Euclides Pacheco, 803, São Paulo - SP',
        status: 'pending',
      },
      {
        publicEmail: '',
        description: 'A ponte que conecta pessoas e organizações.',
        category: 'Social',
        goal: 'Fazer a diferença.',
        objectives: [],
        youtubeUrl: '',
        coverImage: '',
        instagram: 'tranquilicare',
        phone: '11950845288',
        cnpj: '',
        address: 'Rua Euclides Pacheco 803',
        latitude: -23.55,
        longitude: -46.63,
        geocodedAddress: 'Rua Euclides Pacheco, 803, São Paulo - SP',
        status: 'pending',
      },
      'tranquilimaiscare@gmail.com',
    );

    expect(merged.cnpj).toBe('14380200000121');
    expect(merged.publicEmail).toBe('tranquilimaiscare@gmail.com');
  });

  it('prefers non-empty canonical values and always trusts canonical status', () => {
    const merged = mergeNgoProfileSources(
      {
        publicEmail: 'antigo@ong.org',
        description: 'Descrição antiga',
        category: 'Social',
        goal: 'Objetivo antigo',
        objectives: ['Objetivo legado'],
        youtubeUrl: '',
        coverImage: '',
        instagram: '',
        phone: '',
        cnpj: '14380200000121',
        address: 'Endereço antigo, 10',
        latitude: null,
        longitude: null,
        geocodedAddress: '',
        status: 'approved',
      },
      {
        publicEmail: '',
        description: 'Descrição atual',
        category: 'Educação',
        goal: 'Objetivo atual',
        objectives: ['Objetivo atual'],
        youtubeUrl: '',
        coverImage: '',
        instagram: '',
        phone: '',
        cnpj: '11222333000181',
        address: 'Endereço atual, 20',
        latitude: null,
        longitude: null,
        geocodedAddress: '',
        status: 'pending',
      },
      'conta@ong.org',
    );

    expect(merged.description).toBe('Descrição atual');
    expect(merged.cnpj).toBe('11222333000181');
    expect(merged.status).toBe('pending');
  });
});
