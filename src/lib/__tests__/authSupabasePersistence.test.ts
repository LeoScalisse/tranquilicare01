import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  authUpdateUser: vi.fn(),
  authGetUser: vi.fn(),
  saveNgoProfileResult: vi.fn(),
  profileUpdateResult: vi.fn(),
  ngoUpdateResult: vi.fn(),
  ngoUpsertResult: vi.fn(),
  organizationUpdateResult: vi.fn(),
}));

const queryResult = (result: () => unknown) => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve(result())),
    })),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
  })),
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(),
      updateUser: supabaseMocks.authUpdateUser,
      getUser: supabaseMocks.authGetUser,
    },
    rpc: vi.fn((name: string) => {
      if (name === 'save_own_ngo_profile') {
        return Promise.resolve(supabaseMocks.saveNgoProfileResult());
      }
      throw new Error(`unexpected-rpc:${name}`);
    }),
    from: vi.fn((table: string) => ({
      update: vi.fn(() => {
        if (table === 'profiles') {
          return {
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve(supabaseMocks.profileUpdateResult())),
              })),
            })),
          };
        }
        if (table === 'ngo_profiles') return queryResult(supabaseMocks.ngoUpdateResult);
        if (table === 'organizations') return queryResult(supabaseMocks.organizationUpdateResult);
        throw new Error(`unexpected-table:${table}`);
      }),
      upsert: vi.fn(() => {
        if (table === 'ngo_profiles') {
          return {
            select: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve(supabaseMocks.ngoUpsertResult())),
            })),
          };
        }
        throw new Error(`unexpected-upsert-table:${table}`);
      }),
    })),
  },
}));

import { updateUser } from '@/lib/authSupabase';

const authUser = {
  id: 'ngo-1',
  email: 'contato@horizonte.org',
  user_metadata: { account_type: 'ngo' },
};

const profileRow = {
  id: 'ngo-1',
  email: 'contato@horizonte.org',
  name: 'Instituto Horizonte',
  avatar_url: null,
  credits: 0,
  account_type: 'ngo',
  ngo_profile: null,
};

const ngoProfile = {
  publicEmail: 'contato@horizonte.org',
  description: 'Apoio educacional para jovens.',
  category: 'Educação',
  goal: 'Abrir uma nova turma.',
  objectives: [],
  youtubeUrl: '',
  coverImage: '',
  instagram: '',
  phone: '',
  cnpj: '11222333000181',
  address: 'Rua das Flores, 120 - Centro, São Paulo - SP',
  latitude: -23.55052,
  longitude: -46.633308,
  geocodedAddress: 'Rua das Flores, 120, São Paulo, SP, Brasil',
  status: 'pending' as const,
};

describe('Supabase organization profile persistence', () => {
  beforeEach(() => {
    supabaseMocks.authUpdateUser.mockReset().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    supabaseMocks.authGetUser.mockReset().mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    supabaseMocks.saveNgoProfileResult.mockReset().mockReturnValue({
      data: { user_id: 'ngo-1' },
      error: null,
    });
    supabaseMocks.profileUpdateResult.mockReset().mockReturnValue({ data: profileRow, error: null });
    supabaseMocks.ngoUpdateResult.mockReset().mockReturnValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });
    supabaseMocks.ngoUpsertResult.mockReset().mockReturnValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });
    supabaseMocks.organizationUpdateResult.mockReset().mockReturnValue({ data: null, error: null });
  });

  it('rejects the save when the organization row was not persisted', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: '42501',
    });
    expect(supabaseMocks.authUpdateUser).not.toHaveBeenCalled();
  });

  it('rejects a silent update that matched no organization row', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({ data: null, error: null });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toThrow(
      'organization-profile-not-persisted',
    );
  });

  it('creates the organization profile row when an older account does not have one', async () => {
    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).resolves.toMatchObject({
      id: 'ngo-1',
      accountType: 'ngo',
    });
  });

  it('rejects the save when the canonical organization was not created', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({
      data: null,
      error: { code: 'P0002', message: 'organization-not-persisted' },
    });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: 'P0002',
    });
  });

  it('rejects the save when the account profile fields were not persisted', async () => {
    supabaseMocks.saveNgoProfileResult.mockReturnValue({
      data: null,
      error: { code: '42501', message: 'permission denied for table profiles' },
    });

    await expect(updateUser({ name: 'Instituto Horizonte', ngoProfile })).rejects.toMatchObject({
      code: '42501',
    });
  });
});
